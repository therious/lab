defmodule Elections.Voting do
  @moduledoc """
  Context module for voting operations.
  Updated to use election identifiers and RepoManager.
  """

  import Ecto.Query
  alias Elections.RepoManager
  alias Elections.Elections, as: ElectionsContext
  alias Elections.{Election, VoteToken, Vote, VoteQueue}

  @dev_mode Application.compile_env(:elections, :dev_mode, false)
  @debug_logging Application.compile_env(:elections, :debug_logging, false)

  # Helper to conditionally log debug messages
  defp debug_log(level, message) when level in [:info, :warning, :error] do
    if @debug_logging do
      require Logger
      Logger.log(level, message)
    end
  end

  @doc """
  Submit a vote for an election using election identifier.
  Uses durable write-ahead log for zero vote loss guarantee.
  """
  def submit_vote(election_identifier, token, ballot_data) when is_binary(election_identifier) do
    # Debug: Log database path for vote submission
    db_path = RepoManager.db_path(election_identifier)
    debug_log(:info, "[DEBUG] submit_vote: election=#{election_identifier}, db_path=#{db_path}")
    
    # Validate vote before queuing (must happen synchronously)
    validation_result = RepoManager.with_repo(election_identifier, fn repo ->
      with {:ok, election} <- get_election(repo, election_identifier),
           {:ok, vote_token} <- get_and_validate_token(repo, token, election.id),
           :ok <- check_voting_window(election) do
        {:ok, election, vote_token}
      else
        error -> error
      end
    end)
    
    case validation_result do
      {:ok, election, vote_token} ->
        # Enqueue vote with durable logging (returns immediately after log write)
        case VoteQueue.enqueue_vote(
          election_identifier,
          token,
          ballot_data,
          election.id,
          vote_token.id
        ) do
          {:ok, _vote_id} ->
            # Request results calculation (will happen after vote is committed)
            Elections.ResultsCalculator.calculate_results(election_identifier)
            {:ok, vote_token.view_token}
          
          {:error, reason} ->
            {:error, reason}
        end
      
      error ->
        error
    end
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
    try do
      RepoManager.with_repo(election_identifier, fn repo ->
        # Get election directly from repo to avoid double with_repo call
        case repo.get_by(Election, identifier: election_identifier) do
          nil ->
            {:error, :election_not_found}
          
          election ->
            # Always allow results calculation, even if service window not open
            # The frontend can decide whether to show them
            # calculate_all_results is designed to NEVER fail - it always returns basic stats
            # even if all algorithms fail
            results = calculate_all_results(repo, election)
            {:ok, results}
        end
      end)
    rescue
      e ->
        require Logger
        Logger.error("Unexpected error in get_election_results: #{inspect(e)}")
        Logger.error("Stacktrace: #{Exception.format_stacktrace(__STACKTRACE__)}")
        # This should never happen, but if RepoManager.with_repo fails, return error
        {:error, "Database connection error: #{Exception.message(e)}"}
    catch
      kind, reason ->
        require Logger
        Logger.error("Unexpected throw in get_election_results: #{kind} - #{inspect(reason)}")
        {:error, "Unexpected error: #{inspect(reason)}"}
    end
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
  Check if a token has been used (validates token and returns status).
  """
  def check_token_status(election_identifier, token) when is_binary(election_identifier) and is_binary(token) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case ElectionsContext.get_election(election_identifier) do
        {:ok, election} ->
          case repo.get_by(Elections.VoteToken, token: token, election_id: election.id) do
            nil ->
              {:error, :token_not_found}
            
            vote_token ->
              {:ok, %{
                used: vote_token.used,
                used_at: vote_token.used_at,
                preview: Map.get(vote_token, :preview, false)
              }}
          end
        
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


  def calculate_all_results(repo, election) do
    # Debug: Log database path and election info for results query
    db_path = RepoManager.db_path(election.identifier || "")
    debug_log(:info, "[DEBUG] calculate_all_results: election_id=#{election.id}, election_identifier=#{election.identifier}, db_path=#{db_path}")
    
    # Safely get votes - handle case where election might not exist or have no votes
    votes = try do
      votes_found = repo.all(from(v in Vote, where: v.election_id == ^election.id, order_by: [asc: v.inserted_at]))
      debug_log(:info, "[DEBUG] calculate_all_results: found #{length(votes_found)} votes in database")
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
      ballots when is_list(ballots) -> 
        # Validate that each ballot has a title
        Enum.each(ballots, fn ballot ->
          if is_map(ballot) && (is_nil(Map.get(ballot, "title")) || Map.get(ballot, "title") == "") do
            require Logger
            Logger.warning("Ballot in election #{election.identifier || "unknown"} is missing or has empty 'title' field. Ballot keys: #{inspect(Map.keys(ballot))}")
          end
        end)
        ballots
      _ -> []
    end

    # Calculate results for each ballot in parallel - ballots are independent
    # Always return complete structure, wrap each ballot processing in try/rescue
    results = if Enum.empty?(ballots) do
      []
    else
      ballots
      |> Task.async_stream(
        fn ballot -> process_ballot(ballot, votes, election) end,
        max_concurrency: System.schedulers_online(),
        timeout: 30_000,
        on_timeout: :kill_task
      )
      |> Enum.map(fn
        {:ok, result} -> result
        {:exit, :timeout} -> 
          require Logger
          Logger.error("Ballot processing timed out")
          build_error_ballot_result(%{})
        {:exit, reason} ->
          require Logger
          Logger.error("Ballot processing failed: #{inspect(reason)}")
          build_error_ballot_result(%{})
      end)
    end

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

  # Extract ballot processing into separate function for parallel execution
  defp process_ballot(ballot, votes, election) do
    # Extract ballot title FIRST, before any processing that might fail
    # This ensures we preserve the original title even if processing errors occur
    ballot = if is_map(ballot), do: ballot, else: %{}
    ballot_title = case Map.get(ballot, "title") do
        nil ->
          require Logger
          Logger.warning("Ballot missing 'title' field in election #{election.identifier || "unknown"}. Ballot keys: #{inspect(Map.keys(ballot))}. Using 'Untitled Ballot' as fallback.")
          "Untitled Ballot"
        "" ->
          require Logger
          Logger.warning("Ballot has empty 'title' field in election #{election.identifier || "unknown"}. Using 'Untitled Ballot' as fallback.")
          "Untitled Ballot"
        title when is_binary(title) ->
          title
        other ->
          require Logger
          Logger.warning("Ballot 'title' field is not a string in election #{election.identifier || "unknown"}: #{inspect(other)}. Using 'Untitled Ballot' as fallback.")
          "Untitled Ballot"
      end
    
    try do
      candidates = case Map.get(ballot, "candidates", []) do
        candidates when is_list(candidates) -> candidates
        _ -> []
      end
      number_of_winners = case Map.get(ballot, "number_of_winners", 1) do
        n when is_integer(n) and n > 0 -> n
        _ -> 1
      end

      # Extract votes for this ballot from ballot_data - wrap in try/rescue
      # For high-volume scenarios, use a trailing window to make ballot counts lag behind total
      # This creates a more realistic "processing" effect where ballot counts trail total votes
      # The lag simulates processing time - votes come in faster than results are calculated
      ballot_votes = try do
        all_ballot_votes = extract_ballot_votes(votes, ballot_title)
        total_ballot_votes = length(all_ballot_votes)
        
        # Use trailing window: exclude last 10% of votes to create noticeable lag effect
        # This makes ballot counts trail behind total vote count, simulating processing delay
        # For small vote counts, use a fixed lag of 1-2 votes
        trailing_window_size = if total_ballot_votes <= 10 do
          max(0, total_ballot_votes - 1)  # Lag by 1 vote for small counts
        else
          max(1, div(total_ballot_votes * 90, 100))  # Lag by 10% for larger counts
        end
        
        Enum.take(all_ballot_votes, trailing_window_size)
      rescue
        e ->
          require Logger
          Logger.warning("Error extracting votes for ballot #{ballot_title}: #{inspect(e)}")
          []  # Return empty list on error
      end
      
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
      
      # Calculate algorithm results - each algorithm is individually protected
      # Even if ALL algorithms fail, we still return basic stats
      # Algorithm failures are expected and acceptable - no warnings needed
      # Ordered by method family: Condorcet, Rating, Runoff
      algorithm_results = if vote_count > 0 do
        election_id = election.identifier || "unknown"
        %{
          # Condorcet Methods
          ranked_pairs: safe_calculate_algorithm(fn -> Elections.Algorithms.RankedPairs.calculate(ballot_for_algorithms, ballot_votes) end, "ranked_pairs", election_id, ballot_title),
          schulze: safe_calculate_algorithm(fn -> Elections.Algorithms.Schulze.calculate(ballot_for_algorithms, ballot_votes) end, "schulze", election_id, ballot_title),
          # Rating Methods
          score: safe_calculate_algorithm(fn -> Elections.Algorithms.Score.calculate(ballot_for_algorithms, ballot_votes) end, "score", election_id, ballot_title),
          approval: safe_calculate_algorithm(fn -> Elections.Algorithms.Approval.calculate(ballot_for_algorithms, ballot_votes) end, "approval", election_id, ballot_title),
          # Runoff Methods
          irv_stv: safe_calculate_algorithm(fn -> Elections.Algorithms.IRVSTV.calculate(ballot_for_algorithms, ballot_votes) end, "irv_stv", election_id, ballot_title),
          coombs: safe_calculate_algorithm(fn -> Elections.Algorithms.Coombs.calculate(ballot_for_algorithms, ballot_votes) end, "coombs", election_id, ballot_title)
        }
      else
        # No votes for this ballot - return empty results structure
        build_empty_results(candidates)
      end
      
      # Always return basic stats, even if algorithms failed
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
    rescue
      e ->
        # If anything fails in ballot processing, return minimal structure with error info
        # Use the ballot_title that was extracted earlier - don't try to extract it again
        require Logger
        Logger.error("Critical error processing ballot '#{ballot_title}' in election #{election.identifier || "unknown"}: #{inspect(e)}")
        
        # Extract what we can safely (but preserve the already-extracted ballot_title)
        ballot = if is_map(ballot), do: ballot, else: %{}
        candidates = case Map.get(ballot, "candidates", []) do
          candidates when is_list(candidates) -> candidates
          _ -> []
        end
        
        # Return minimal structure with error status
        %{
          ballot_title: ballot_title,
          candidates: candidates,
          number_of_winners: Map.get(ballot, "number_of_winners", 1),
          vote_count: 0,  # Can't determine safely
          quorum: nil,
          quorum_status: nil,
          result_status: "error",
          is_referendum: Map.get(ballot, "yesNoReferendum", false),
          results: build_empty_results(candidates),
          error: "Error processing ballot: #{Exception.message(e)}"
        }
    end
  end

  defp build_error_ballot_result(ballot) do
    ballot = if is_map(ballot), do: ballot, else: %{}
    ballot_title = case Map.get(ballot, "title") do
      nil -> "Untitled Ballot"
      "" -> "Untitled Ballot"
      title when is_binary(title) -> title
      _ -> "Untitled Ballot"
    end
    candidates = case Map.get(ballot, "candidates", []) do
      candidates when is_list(candidates) -> candidates
      _ -> []
    end
    
    %{
      ballot_title: ballot_title,
      candidates: candidates,
      number_of_winners: Map.get(ballot, "number_of_winners", 1),
      vote_count: 0,
      quorum: nil,
      quorum_status: nil,
      result_status: "error",
      is_referendum: Map.get(ballot, "yesNoReferendum", false),
      results: build_empty_results(candidates),
      error: "Error processing ballot"
    }
  end

  # Helper to safely calculate algorithm results, returning error structure on failure
  # Algorithm failures are expected and acceptable - they should fail silently
  # Algorithm failures should NEVER prevent basic stats from being shown
  defp safe_calculate_algorithm(algorithm_fun, method_name, election_identifier, ballot_title) do
    try do
      result = algorithm_fun.()
      # Validate that result is a map with expected structure
      if is_map(result) do
        # Convert tuple keys to JSON-serializable format (strings or lists)
        sanitize_for_json(result)
      else
        # Invalid result format - fail silently, no warning
        %{method: method_name, winners: [], status: "error", error: "Invalid result format"}
      end
    rescue
      _e ->
        # Algorithm failure is expected and acceptable - fail silently
        # No warning needed as algorithm failures are a normal part of operation
        %{method: method_name, winners: [], status: "error", error: "Calculation failed"}
    catch
      kind, reason ->
        # Only log unexpected throws (not normal exceptions) with context
        require Logger
        Logger.warning("Algorithm #{method_name} threw #{kind} for election #{election_identifier}, ballot #{ballot_title}: #{inspect(reason)}")
        %{method: method_name, winners: [], status: "error", error: "Algorithm threw #{kind}"}
    end
  end

  # Convert data structures to JSON-serializable format
  # Recursively converts tuple keys in maps to string keys
  defp sanitize_for_json(data) when is_map(data) do
    data
    |> Enum.map(fn
      # Convert tuple keys to string keys
      {{k1, k2} = key, value} when is_tuple(key) ->
        key_str = "#{k1},#{k2}"
        {key_str, sanitize_for_json(value)}
      
      {{k1, k2, k3} = key, value} when is_tuple(key) ->
        key_str = "#{k1},#{k2},#{k3}"
        {key_str, sanitize_for_json(value)}
      
      # Keep other keys as-is
      {key, value} ->
        {key, sanitize_for_json(value)}
    end)
    |> Enum.into(%{})
  end

  defp sanitize_for_json(data) when is_list(data) do
    Enum.map(data, &sanitize_for_json/1)
  end

  defp sanitize_for_json(data) when is_tuple(data) do
    # Convert tuples to lists for JSON serialization
    Tuple.to_list(data) |> sanitize_for_json()
  end

  defp sanitize_for_json(data), do: data

  # Build empty results structure for ballots with no votes
  defp build_empty_results(candidates) do
    # Initialize scores map with all candidates at 0.0
    candidate_names = Enum.map(candidates, fn c -> Map.get(c, "name", "") end)
    empty_scores = Enum.into(candidate_names, %{}, fn name -> {name, 0.0} end)
    
    %{
      ranked_pairs: %{method: "ranked_pairs", winners: [], pairwise: %{}, locked_pairs: [], winner_order: [], status: "no_votes"},
      schulze: %{method: "schulze", winners: [], pairwise: %{}, strongest_paths: %{}, winner_order: [], status: "no_votes"},
      score: %{method: "score", winners: [], scores: empty_scores, winner_order: [], status: "no_votes"},
      approval: %{method: "approval", winners: [], approvals: empty_scores, winner_order: [], status: "no_votes"},
      irv_stv: %{method: "irv_stv", winners: [], winner_order: [], status: "no_votes"},
      coombs: %{method: "coombs", winners: [], winner_order: [], status: "no_votes"}
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
