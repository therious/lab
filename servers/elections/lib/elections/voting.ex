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
    RepoManager.with_repo(election_identifier, fn repo ->
      repo.transaction(fn ->
        with {:ok, election} <- get_election(repo, election_identifier),
             {:ok, vote_token} <- get_and_validate_token(repo, token, election.id),
             :ok <- check_voting_window(election),
             {:ok, _vote} <- create_vote(repo, election, vote_token, ballot_data) do
          vote_token.view_token
        else
          error -> repo.rollback(error)
        end
      end)
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
          try do
            results = calculate_all_results(repo, election)
            {:ok, results}
          rescue
            e ->
              # Log the error for debugging
              require Logger
              Logger.error("Error calculating results: #{inspect(e)}")
              error_message = Exception.message(e)
              # Provide a user-friendly error message if the exception message is empty or unhelpful
              user_message = cond do
                error_message == "" or error_message == nil ->
                  "An error occurred while calculating the election results. Please try again later or contact support if the problem persists."
                String.contains?(error_message, "empty") or String.contains?(error_message, "nil") ->
                  "The election results could not be calculated because some required data is missing. Please contact support if this problem persists."
                true ->
                  "An error occurred while calculating the election results: #{error_message}. Please try again later or contact support if the problem persists."
              end
              {:error, user_message}
          end

        error ->
          error
      end
    end)
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

    if DateTime.compare(now, election.voting_start) != :lt &&
         DateTime.compare(now, election.voting_end) != :gt do
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

        # Calculate and broadcast updated results
        Task.start(fn ->
          results = calculate_all_results(repo, election)
          Phoenix.PubSub.broadcast(
            Elections.PubSub,
            "dashboard:#{election.identifier}",
            {:results_updated, election.identifier, results}
          )
        end)

        {:ok, vote}

      error ->
        error
    end
  end

  defp calculate_all_results(repo, election) do
    votes = repo.all(from(v in Vote, where: v.election_id == ^election.id, order_by: [asc: v.inserted_at]))

    # Get vote timestamps for time series data
    vote_timestamps = Enum.map(votes, fn vote -> vote.inserted_at end)

    # Extract ballots from config
    ballots = Map.get(election.config || %{}, "ballots", [])

    # Calculate results for each ballot
    results = Enum.map(ballots, fn ballot ->
      ballot_title = Map.get(ballot, "title", "Untitled Ballot")
      candidates = Map.get(ballot, "candidates", [])
      number_of_winners = Map.get(ballot, "number_of_winners", 1)

      # Extract votes for this ballot from ballot_data
      ballot_votes = extract_ballot_votes(votes, ballot_title)

      # Create ballot map with candidates and number_of_winners for algorithms
      ballot_for_algorithms = %{
        "candidates" => candidates,
        "number_of_winners" => number_of_winners
      }
      
      # Calculate results only if there are votes
      algorithm_results = if length(ballot_votes) > 0 do
        %{
          ranked_pairs: Elections.Algorithms.RankedPairs.calculate(ballot_for_algorithms, ballot_votes),
          shulze: Elections.Algorithms.Shulze.calculate(ballot_for_algorithms, ballot_votes),
          score: Elections.Algorithms.Score.calculate(ballot_for_algorithms, ballot_votes),
          irv_stv: Elections.Algorithms.IRVSTV.calculate(ballot_for_algorithms, ballot_votes),
          coombs: Elections.Algorithms.Coombs.calculate(ballot_for_algorithms, ballot_votes)
        }
      else
        %{
          ranked_pairs: %{method: "ranked_pairs", winners: [], status: "no_votes"},
          shulze: %{method: "shulze", winners: [], status: "no_votes"},
          score: %{method: "score", winners: [], scores: %{}, status: "no_votes"},
          irv_stv: %{method: "irv_stv", winners: [], status: "no_votes"},
          coombs: %{method: "coombs", winners: [], status: "no_votes"}
        }
      end
      
      %{
        ballot_title: ballot_title,
        candidates: candidates,
        number_of_winners: number_of_winners,
        vote_count: length(ballot_votes),
        results: algorithm_results
      }
    end)

    # Return results with metadata
    %{
      results: results,
      metadata: %{
        total_votes: length(votes),
        vote_timestamps: Enum.map(vote_timestamps, fn ts -> DateTime.to_iso8601(ts) end),
        voting_start: DateTime.to_iso8601(election.voting_start),
        voting_end: DateTime.to_iso8601(election.voting_end),
        election_identifier: election.identifier
      }
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
