defmodule Elections.Elections do
  @moduledoc """
  Context module for election management operations.
  Handles operations across multiple election databases.
  """

  import Ecto.Query
  alias Elections.RepoManager
  alias Elections.Election

  @doc """
  List all available elections (across all databases).
  Returns elections that are:
  - Currently in their voting window, OR
  - Will start voting within the next 30 days, OR
  - Are in their service window (for viewing results)
  """
  def list_available_elections do
    now = DateTime.utc_now()
    future_cutoff = DateTime.add(now, 30, :day)
    
    RepoManager.list_elections()
    |> Enum.flat_map(fn election_identifier ->
      RepoManager.with_repo(election_identifier, fn repo ->
        from(e in Election,
          where: 
            # Currently in voting window
            (e.voting_start <= ^now and e.voting_end >= ^now) or
            # Voting will start soon (within 30 days)
            (e.voting_start >= ^now and e.voting_start <= ^future_cutoff) or
            # In service window (for viewing results)
            (e.service_start <= ^now and (is_nil(e.service_end) or e.service_end >= ^now))
        )
        |> repo.all()
        |> Enum.map(&format_election_summary(&1, election_identifier))
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

  defp format_election_summary(election, election_identifier) do
    %{
      identifier: election_identifier,
      title: Map.get(election.config || %{}, "title", "Untitled Election"),
      description: Map.get(election.config || %{}, "description"),
      voting_start: election.voting_start,
      voting_end: election.voting_end,
      service_start: election.service_start,
      service_end: election.service_end,
      ballot_count: length(Map.get(election.config || %{}, "ballots", []))
    }
  end
end

