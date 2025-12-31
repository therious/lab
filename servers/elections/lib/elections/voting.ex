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
          with :ok <- check_service_window(election) do
            results = calculate_all_results(repo, election)
            {:ok, results}
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
    votes = repo.all(from(v in Vote, where: v.election_id == ^election.id))

    # Extract ballots from config
    ballots = Map.get(election.config || %{}, "ballots", [])

    # Calculate results for each ballot
    Enum.map(ballots, fn ballot ->
      ballot_title = Map.get(ballot, "title", "Untitled Ballot")
      candidates = Map.get(ballot, "candidates", [])
      number_of_winners = Map.get(ballot, "number_of_winners", 1)

      # Extract votes for this ballot from ballot_data
      ballot_votes = extract_ballot_votes(votes, ballot_title)

      %{
        ballot_title: ballot_title,
        candidates: candidates,
        number_of_winners: number_of_winners,
        vote_count: length(ballot_votes),
        results: %{
          ranked_pairs: Elections.Algorithms.RankedPairs.calculate(ballot, ballot_votes),
          shulze: Elections.Algorithms.Shulze.calculate(ballot, ballot_votes),
          score: Elections.Algorithms.Score.calculate(ballot, ballot_votes),
          irv_stv: Elections.Algorithms.IRVSTV.calculate(ballot, ballot_votes),
          coombs: Elections.Algorithms.Coombs.calculate(ballot, ballot_votes)
        }
      }
    end)
  end

  defp extract_ballot_votes(votes, ballot_title) do
    Enum.map(votes, fn vote ->
      ballot_data = vote.ballot_data || %{}
      Map.get(ballot_data, ballot_title, %{})
    end)
    |> Enum.filter(&(map_size(&1) > 0))
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
