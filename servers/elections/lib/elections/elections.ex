defmodule Elections.Elections do
  @moduledoc """
  Context module for election management operations.
  Handles operations across multiple election databases.
  """

  alias Elections.RepoManager
  alias Elections.Election

  @doc """
  List all available elections (across all databases).
  Returns all elections, including upcoming ones that haven't started yet.
  """
  def list_available_elections do
    now = DateTime.utc_now()
    
    RepoManager.list_elections()
    |> Enum.flat_map(fn election_identifier ->
      RepoManager.with_repo(election_identifier, fn repo ->
        # Get all elections - no filtering by date
        import Ecto.Query
        repo.all(from(e in Election))
        |> Enum.map(&format_election_summary(&1, election_identifier, now))
      end)
    end)
  end

  @doc """
  Get an election by identifier.
  """
  def get_election(election_identifier) when is_binary(election_identifier) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case repo.get_by(Election, identifier: election_identifier) do
        nil -> {:error, :election_not_found}
        election -> {:ok, election}
      end
    end)
  end

  @doc """
  Get election with ballots extracted from config.
  """
  def get_election_with_ballots(election_identifier) when is_binary(election_identifier) do
    case get_election(election_identifier) do
      {:ok, election} ->
        ballots = Map.get(election.config || %{}, "ballots", [])
        {:ok, Map.put(election, :ballots, ballots)}
      
      error ->
        error
    end
  end

  defp format_election_summary(election, election_identifier, now) do
    voting_start = election.voting_start
    voting_end = election.voting_end
    
    # Determine election status
    status = cond do
      voting_start > now -> "upcoming"
      voting_start <= now and voting_end >= now -> "open"
      voting_end < now -> "closed"
      true -> "unknown"
    end
    
    %{
      identifier: election_identifier,
      title: Map.get(election.config || %{}, "title", "Untitled Election"),
      description: Map.get(election.config || %{}, "description"),
      voting_start: voting_start,
      voting_end: voting_end,
      service_start: election.service_start,
      service_end: election.service_end,
      ballot_count: length(Map.get(election.config || %{}, "ballots", [])),
      status: status
    }
  end
end

