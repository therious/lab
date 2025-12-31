defmodule Elections.Voting do
  @moduledoc """
  Context module for voting operations.
  """

  import Ecto.Query
  alias Elections.Repo
  alias Elections.Election
  alias Elections.VoteToken
  alias Elections.Vote

  @dev_mode Application.compile_env(:elections, :dev_mode, false)

  @doc """
  Submit a vote for an election.
  """
  def submit_vote(election_id, token, ballot) do
    Repo.transaction(fn ->
      with {:ok, election} <- get_election(election_id),
           {:ok, vote_token} <- get_and_validate_token(token, election_id),
           :ok <- check_voting_window(election),
           {:ok, _vote} <- create_vote(election, vote_token, ballot) do
        vote_token.view_token
      else
        error -> Repo.rollback(error)
      end
    end)
  end

  @doc """
  View a submitted vote using both tokens.
  """
  def view_vote(election_id, token, view_token) do
    case Repo.get_by(VoteToken, token: token, view_token: view_token) do
      nil ->
        {:error, :not_found}

      vote_token ->
        case Repo.get_by(Vote, vote_token_id: vote_token.id, election_id: election_id) do
          nil -> {:error, :not_found}
          vote -> {:ok, vote}
        end
    end
  end

  @doc """
  List all elections available for viewing (within service window).
  """
  def list_available_elections do
    now = DateTime.utc_now()

    from(e in Election,
      where: e.service_start <= ^now and (is_nil(e.service_end) or e.service_end >= ^now)
    )
    |> Repo.all()
    |> Enum.map(&format_election_summary/1)
  end

  @doc """
  Get election results for dashboard.
  """
  def get_election_results(election_id) do
    with {:ok, election} <- get_election(election_id),
         :ok <- check_service_window(election) do
      results = calculate_all_results(election)
      {:ok, results}
    end
  end

  @doc """
  Get raw tally data for an election.
  """
  def get_election_tally(election_id) do
    case get_election(election_id) do
      {:ok, election} ->
        votes = Repo.all(from(v in Vote, where: v.election_id == ^election.id))
        {:ok, %{election_id: election_id, vote_count: length(votes), votes: votes}}

      error ->
        error
    end
  end

  @doc """
  Get visualization data for a specific method.
  """
  def visualize_results(election_id, method) do
    with {:ok, election} <- get_election(election_id),
         :ok <- check_service_window(election) do
      votes = Repo.all(from(v in Vote, where: v.election_id == ^election.id))
      visualization = generate_visualization(election, votes, method)
      {:ok, visualization}
    end
  end

  # Private functions

  defp get_election(election_id) do
    case Repo.get(Election, election_id) do
      nil -> {:error, :election_not_found}
      election -> {:ok, election}
    end
  end

  defp get_and_validate_token(token, election_id) do
    case Repo.get_by(VoteToken, token: token, election_id: election_id) do
      nil ->
        {:error, :token_not_found}

      vote_token ->
        if vote_token.used && !@dev_mode do
          {:error, :token_already_used}
        else
          {:ok, vote_token}
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

  defp create_vote(election, vote_token, ballot) do
    changeset =
      Vote.changeset(%Vote{}, %{
        election_id: election.id,
        vote_token_id: vote_token.id,
        ballot_data: ballot
      })

    case Repo.insert(changeset) do
      {:ok, vote} ->
        # Mark token as used (unless in dev mode)
        unless @dev_mode do
          vote_token
          |> VoteToken.changeset(%{used: true, used_at: DateTime.utc_now()})
          |> Repo.update()
        end

        {:ok, vote}

      error ->
        error
    end
  end

  defp format_election_summary(election) do
    %{
      id: election.id,
      identifier: election.identifier,
      number_of_winners: election.number_of_winners,
      voting_start: election.voting_start,
      voting_end: election.voting_end,
      service_start: election.service_start,
      service_end: election.service_end
    }
  end

  defp calculate_all_results(election) do
    votes = Repo.all(from(v in Vote, where: v.election_id == ^election.id))

    %{
      ranked_pairs: Elections.Algorithms.RankedPairs.calculate(election, votes),
      shulze: Elections.Algorithms.Shulze.calculate(election, votes),
      score: Elections.Algorithms.Score.calculate(election, votes),
      irv_stv: Elections.Algorithms.IRVSTV.calculate(election, votes),
      coombs: Elections.Algorithms.Coombs.calculate(election, votes)
    }
  end

  defp generate_visualization(election, votes, method) do
    # Placeholder - will be implemented with actual visualization data
    %{
      method: method,
      election_id: election.id,
      visualization_type: "sankey",
      data: []
    }
  end
end

