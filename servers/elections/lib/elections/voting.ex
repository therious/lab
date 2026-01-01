defmodule Elections.Voting do
  @moduledoc """
  Context module for voting operations.
  Updated to use election identifiers and RepoManager.
  """

  import Ecto.Query
  alias Elections.RepoManager
  alias Elections.Elections, as: ElectionsContext
  alias Elections.{Election, VoteToken, Vote}

  @dev_mode Application.compile_env(:elections, :dev_mode, false)

  @doc """
  Submit a vote for an election using election identifier.
  """
  def submit_vote(election_identifier, token, ballot_data) when is_binary(election_identifier) do
    # TEMP DEBUG: Log database path for vote submission
    db_path = RepoManager.db_path(election_identifier)
    require Logger
    Logger.info("[DEBUG] submit_vote: election=#{election_identifier}, db_path=#{db_path}")
    
    RepoManager.with_repo(election_identifier, fn repo ->
      result = repo.transaction(fn ->
        with {:ok, election} <- get_election(repo, election_identifier),
             {:ok, vote_token} <- get_and_validate_token(repo, token, election.id),
             :ok <- check_voting_window(election),
             {:ok, _vote} <- create_vote(repo, election, vote_token, ballot_data) do
          vote_token.view_token
        else
          {:error, _reason} = error -> 
            # Pass the error tuple to rollback - Ecto will wrap it in {:error, ...}
            repo.rollback(error)
          error -> 
            # Handle non-tuple errors (shouldn't happen, but be safe)
            repo.rollback({:error, error})
        end
      end)
      
      # Unwrap transaction result - Ecto wraps rollback values in {:error, value}
      case result do
        {:ok, view_token} -> {:ok, view_token}
        {:error, {:error, reason}} -> {:error, reason}  # Unwrap double-wrapped error
        {:error, error} -> error  # Single-wrapped error (shouldn't happen with our code)
        other -> {:error, other}  # Fallback for unexpected transaction results
      end
    end)
  end

  @doc """
  View a submitted vote using both tokens and election identifier.
  """
  def view_vote(election_identifier, token, view_token) when is_binary(election_identifier) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case repo.get_by(VoteToken, token: token, view_token: view_token) do
        nil ->
          {:error, :not_found}

        vote_token ->
          case repo.get_by(Vote, vote_token_id: vote_token.id, election_id: vote_token.election_id) do
            nil -> {:error, :not_found}
            vote -> {:ok, vote}
          end
      end
    end)
  end

  @doc """
  List all elections available for viewing (within service window).
  Delegates to ElectionsContext.
  """
  def list_available_elections do
    ElectionsContext.list_available_elections()
  end

  @doc """
  Get election results for dashboard using election identifier.
  """
  def get_election_results(election_identifier) when is_binary(election_identifier) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case ElectionsContext.get_election(election_identifier) do
        {:ok, election} ->
          # Always allow results calculation, even if service window not open
          # The frontend can decide whether to show them
          # Try to calculate results, but always return something even on error
          try do
            results = calculate_all_results(repo, election)
            {:ok, results}
          rescue
            e ->
              # Log the error for debugging
              require Logger
              Logger.error("Error calculating results: #{inspect(e)}")
              # Return partial results with error information instead of failing completely
              # This allows the frontend to show what it can (stats, timeline, etc.)
              partial_results = build_partial_results_on_error(repo, election, e)
              {:ok, partial_results}
          end

        error ->
          error
      end
    end)
  end

  # Build partial results structure when calculation fails
  defp build_partial_results_on_error(repo, election, error) do
    # Try to get at least vote count and timestamps
    votes = try do
      repo.all(from(v in Vote, where: v.election_id == ^election.id, order_by: [asc: v.inserted_at]))
    rescue
      _ -> []
    end

    vote_timestamps = Enum.map(votes, fn vote -> vote.inserted_at end)
    ballots = case Map.get(election.config || %{}, "ballots", []) do
      ballots when is_list(ballots) -> ballots
      _ -> []
    end

    # Build minimal results structure
    results = Enum.map(ballots, fn ballot ->
      ballot = if is_map(ballot), do: ballot, else: %{}
      candidates = case Map.get(ballot, "candidates", []) do
        candidates when is_list(candidates) -> candidates
        _ -> []
      end
      number_of_winners = case Map.get(ballot, "number_of_winners", 1) do
        n when is_integer(n) and n > 0 -> n
        _ -> 1
      end

      # Return error status for all algorithms
      error_result = %{
        method: "error",
        winners: [],
        status: "error",
        error: "Calculation failed: #{Exception.message(error)}"
      }

      %{
        ballot_title: Map.get(ballot, "title", "Untitled Ballot"),
        candidates: candidates,
        number_of_winners: number_of_winners,
        vote_count: 0,
        results: %{
          ranked_pairs: error_result,
          shulze: error_result,
          score: error_result,
          irv_stv: error_result,
          coombs: error_result
        }
      }
    end)

    safe_serialize_dt = fn dt ->
      try do
        if dt, do: DateTime.to_iso8601(dt), else: nil
      rescue
        _ -> nil
      end
    end

    %{
      results: results,
      metadata: %{
        total_votes: length(votes),
        vote_timestamps: Enum.map(vote_timestamps, safe_serialize_dt) |> Enum.filter(&(&1 != nil)),
        voting_start: safe_serialize_dt.(election.voting_start),
        voting_end: safe_serialize_dt.(election.voting_end),
        election_identifier: election.identifier || ""
      },
      calculation_error: true,
      error_message: Exception.message(error)
    }
  end

  @doc """
  Get raw tally data for an election using election identifier.
  """
  def get_election_tally(election_identifier) when is_binary(election_identifier) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case ElectionsContext.get_election(election_identifier) do
        {:ok, election} ->
          votes = repo.all(from(v in Vote, where: v.election_id == ^election.id))
          {:ok, %{election_identifier: election_identifier, vote_count: length(votes), votes: votes}}

        error ->
          error
      end
    end)
  end

  @doc """
  Get visualization data for a specific method using election identifier.
  """
  def visualize_results(election_identifier, method) when is_binary(election_identifier) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case ElectionsContext.get_election(election_identifier) do
        {:ok, election} ->
          with :ok <- check_service_window(election) do
            votes = repo.all(from(v in Vote, where: v.election_id == ^election.id))
            visualization = generate_visualization(election, votes, method)
            {:ok, visualization}
          end

        error ->
          error
      end
    end)
  end

  # Private functions

  defp get_election(repo, election_identifier) do
    case repo.get_by(Election, identifier: election_identifier) do
      nil -> {:error, :election_not_found}
      election -> {:ok, election}
    end
  end

  defp get_and_validate_token(repo, token, election_id) do
    case repo.get_by(VoteToken, token: token, election_id: election_id) do
      nil ->
        {:error, :token_not_found}

      vote_token ->
        # Check if token is a preview token (for elections not yet open)
        if Map.get(vote_token, :preview, false) do
          {:error, :voting_not_open}
        else
          if vote_token.used && !@dev_mode do
            {:error, :token_already_used}
          else
            {:ok, vote_token}
          end
        end
    end
  end

  defp check_voting_window(election) do
    now = DateTime.utc_now()

    # voting_end is exclusive: if it's 7:00pm, voting ends at 7:00pm (not inclusive)
    # So we check: now >= voting_start && now < voting_end
    if DateTime.compare(now, election.voting_start) != :lt &&
         DateTime.compare(now, election.voting_end) == :lt do
      :ok
    else
      {:error, :voting_window_closed}
    end
  end

  defp check_service_window(election) do
    now = DateTime.utc_now()

    if DateTime.compare(now, election.service_start) != :lt &&
         (is_nil(election.service_end) || DateTime.compare(now, election.service_end) != :gt) do
      :ok
    else
      {:error, :service_window_not_open}
    end
  end

  defp create_vote(repo, election, vote_token, ballot_data) do
    changeset =
      Vote.changeset(%Vote{}, %{
        election_id: election.id,
        vote_token_id: vote_token.id,
        ballot_data: ballot_data
      })

    case repo.insert(changeset) do
      {:ok, vote} ->
        # TEMP DEBUG: Log successful vote creation
        require Logger
        Logger.info("[DEBUG] create_vote: vote_id=#{vote.id}, election_id=#{election.id}, election_identifier=#{election.identifier}")
        
        # Mark token as used (unless in dev mode)
        unless @dev_mode do
          vote_token
          |> VoteToken.changeset(%{used: true, used_at: DateTime.utc_now()})
          |> repo.update()
        end

        # Broadcast vote submission for real-time updates
        Phoenix.PubSub.broadcast(
          Elections.PubSub,
          "dashboard:#{election.identifier}",
          {:vote_submitted, election.identifier, %{vote_id: vote.id}}
        )

        # Calculate and broadcast updated results with demand-based debouncing
        # Use election identifier so we can set the dynamic repo in the task process
        election_identifier = election.identifier
        
        # Debounce updates: if votes are coming in rapidly, batch them
        # This adapts to actual server load rather than election type
        # Simple approach: always wait a short time to batch rapid updates
        debounce_ms = 500  # Wait 500ms to batch rapid vote submissions
        
        Task.start(fn ->
          # Small delay to batch rapid updates (demand-based, not type-based)
          Process.sleep(debounce_ms)
          
          RepoManager.with_repo(election_identifier, fn task_repo ->
            # Re-fetch election to ensure we have the latest data
            case ElectionsContext.get_election(election_identifier) do
              {:ok, latest_election} ->
                results = calculate_all_results(task_repo, latest_election)
                Phoenix.PubSub.broadcast(
                  Elections.PubSub,
                  "dashboard:#{election_identifier}",
                  {:results_updated, election_identifier, results}
                )
              _ ->
                # Election not found, skip broadcast
                :ok
            end
          end)
        end)

        {:ok, vote}

      error ->
        error
    end
  end

  defp calculate_all_results(repo, election) do
    # TEMP DEBUG: Log database path and election info for results query
    db_path = RepoManager.db_path(election.identifier || "")
    require Logger
    Logger.info("[DEBUG] calculate_all_results: election_id=#{election.id}, election_identifier=#{election.identifier}, db_path=#{db_path}")
    
    # Safely get votes - handle case where election might not exist or have no votes
    votes = try do
      votes_found = repo.all(from(v in Vote, where: v.election_id == ^election.id, order_by: [asc: v.inserted_at]))
      Logger.info("[DEBUG] calculate_all_results: found #{length(votes_found)} votes in database")
      votes_found
    rescue
      e ->
        require Logger
        Logger.error("Error fetching votes: #{inspect(e)}")
        []
    end

    # Get vote timestamps for time series data
    vote_timestamps = Enum.map(votes, fn vote -> vote.inserted_at end)

    # Extract ballots from config - ensure we have a valid ballots list
    ballots = case Map.get(election.config || %{}, "ballots", []) do
      ballots when is_list(ballots) -> ballots
      _ -> []
    end

    # Calculate results for each ballot - always return complete structure
    results = Enum.map(ballots, fn ballot ->
      # Ensure ballot is a map
      ballot = if is_map(ballot), do: ballot, else: %{}
      
      ballot_title = Map.get(ballot, "title", "Untitled Ballot")
      candidates = case Map.get(ballot, "candidates", []) do
        candidates when is_list(candidates) -> candidates
        _ -> []
      end
      number_of_winners = case Map.get(ballot, "number_of_winners", 1) do
        n when is_integer(n) and n > 0 -> n
        _ -> 1
      end

      # Extract votes for this ballot from ballot_data
      ballot_votes = extract_ballot_votes(votes, ballot_title)
      vote_count = length(ballot_votes)
      
      # Check quorum if specified
      quorum = case Map.get(ballot, "quorum") do
        q when is_integer(q) and q > 0 -> q
        _ -> nil
      end
      
      # Determine quorum status
      quorum_status = if quorum do
        if vote_count >= quorum do
          "met"
        else
          "not_met"
        end
      else
        nil
      end
      
      # Determine overall result status based on quorum
      result_status = cond do
        quorum && vote_count < quorum && DateTime.compare(DateTime.utc_now(), election.voting_end) == :lt ->
          # Voting still open and quorum not met - in progress
          "in_progress"
        quorum && vote_count < quorum ->
          # Voting closed and quorum not met - no quorum
          "no_quorum"
        true ->
          # Quorum met or no quorum required - use algorithm status
          nil  # Will be determined by algorithm results
      end

      # Create ballot map with candidates and number_of_winners for algorithms
      ballot_for_algorithms = %{
        "candidates" => candidates,
        "number_of_winners" => number_of_winners
      }
      
      # Always calculate results - algorithms should handle empty votes gracefully
      # Wrap in try/rescue to handle any algorithm errors
      algorithm_results = try do
        if vote_count > 0 do
          %{
            ranked_pairs: safe_calculate_algorithm(fn -> Elections.Algorithms.RankedPairs.calculate(ballot_for_algorithms, ballot_votes) end, "ranked_pairs"),
            shulze: safe_calculate_algorithm(fn -> Elections.Algorithms.Shulze.calculate(ballot_for_algorithms, ballot_votes) end, "shulze"),
            score: safe_calculate_algorithm(fn -> Elections.Algorithms.Score.calculate(ballot_for_algorithms, ballot_votes) end, "score"),
            irv_stv: safe_calculate_algorithm(fn -> Elections.Algorithms.IRVSTV.calculate(ballot_for_algorithms, ballot_votes) end, "irv_stv"),
            coombs: safe_calculate_algorithm(fn -> Elections.Algorithms.Coombs.calculate(ballot_for_algorithms, ballot_votes) end, "coombs")
          }
        else
          # No votes for this ballot - return empty results structure
          build_empty_results(candidates)
        end
      rescue
        e ->
          require Logger
          Logger.error("Error calculating algorithm results for ballot #{ballot_title}: #{inspect(e)}")
          # Return empty results structure on error
          build_empty_results(candidates)
      end
      
      %{
        ballot_title: ballot_title,
        candidates: candidates,
        number_of_winners: number_of_winners,
        vote_count: vote_count,
        quorum: quorum,
        quorum_status: quorum_status,
        result_status: result_status,
        is_referendum: Map.get(ballot, "yesNoReferendum", false),
        results: algorithm_results
      }
    end)

    # Return results with metadata - always complete
    # Safely serialize DateTime values
    safe_serialize_dt = fn dt ->
      try do
        if dt, do: DateTime.to_iso8601(dt), else: nil
      rescue
        _ -> nil
      end
    end
    
    %{
      results: results,
      metadata: %{
        total_votes: length(votes),
        vote_timestamps: Enum.map(vote_timestamps, safe_serialize_dt) |> Enum.filter(&(&1 != nil)),
        voting_start: safe_serialize_dt.(election.voting_start),
        voting_end: safe_serialize_dt.(election.voting_end),
        election_identifier: election.identifier || ""
      }
    }
  end

  # Helper to safely calculate algorithm results, returning empty structure on error
  defp safe_calculate_algorithm(algorithm_fun, method_name) do
    try do
      algorithm_fun.()
    rescue
      e ->
        require Logger
        Logger.warning("Algorithm #{method_name} failed: #{inspect(e)}")
        %{method: method_name, winners: [], status: "error", error: "Calculation failed"}
    end
  end

  # Build empty results structure for ballots with no votes
  defp build_empty_results(candidates) do
    # Initialize scores map with all candidates at 0.0
    candidate_names = Enum.map(candidates, fn c -> Map.get(c, "name", "") end)
    empty_scores = Enum.into(candidate_names, %{}, fn name -> {name, 0.0} end)
    
    %{
      ranked_pairs: %{method: "ranked_pairs", winners: [], pairwise: %{}, locked_pairs: [], status: "no_votes"},
      shulze: %{method: "shulze", winners: [], pairwise: %{}, strongest_paths: %{}, status: "no_votes"},
      score: %{method: "score", winners: [], scores: empty_scores, status: "no_votes"},
      irv_stv: %{method: "irv_stv", winners: [], status: "no_votes"},
      coombs: %{method: "coombs", winners: [], status: "no_votes"}
    }
  end

  defp extract_ballot_votes(votes, ballot_title) do
    Enum.map(votes, fn vote ->
      # Handle case where ballot_data might be nil or not a map
      ballot_data = case vote.ballot_data do
        nil -> %{}
        data when is_map(data) -> data
        _ -> %{}  # Fallback for any other type
      end
      vote_data = Map.get(ballot_data, ballot_title, %{})
      # Ensure vote_data is a map
      vote_data = if is_map(vote_data), do: vote_data, else: %{}
      # Wrap the vote data in a structure that algorithms expect
      %{ballot_data: vote_data}
    end)
    |> Enum.filter(fn wrapped_vote -> 
      ballot_data = wrapped_vote.ballot_data || %{}
      is_map(ballot_data) && map_size(ballot_data) > 0
    end)
  end

  defp generate_visualization(election, votes, method) do
    # For now, return basic visualization structure
    # This will be enhanced later
    %{
      method: method,
      election_identifier: election.identifier,
      visualization_type: "unknown",
      data: [],
      vote_count: length(votes)
    }
  end
end
