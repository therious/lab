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
        |> Enum.map(fn election ->
          # Use the identifier from the database record, not the filename
          # This ensures consistency
          actual_identifier = election.identifier || election_identifier
          format_election_summary(election, actual_identifier, now)
        end)
      end)
    end)
    |> Enum.uniq_by(& &1.identifier)  # Remove duplicates by identifier
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
    config = election.config || %{}
    ballots = Map.get(config, "ballots", [])
    
    # Determine election status
    status = cond do
      voting_start > now -> "upcoming"
      voting_start <= now and voting_end >= now -> "open"
      voting_end < now -> "closed"
      true -> "unknown"
    end
    
    # Create a brief summary of the most important ballots
    # Prioritize: President, Governor, then other high-profile positions
    ballot_summary = create_ballot_summary(ballots)
    
    %{
      identifier: election_identifier,
      title: Map.get(config, "title", "Untitled Election"),
      description: Map.get(config, "description"),
      voting_start: voting_start,
      voting_end: voting_end,
      service_start: election.service_start,
      service_end: election.service_end,
      ballot_count: length(ballots),
      status: status,
      ballot_summary: ballot_summary
    }
  end

  defp create_ballot_summary(ballots) when is_list(ballots) do
    # Prioritize ballots by importance (Presidential, Gubernatorial, etc.)
    prioritized = Enum.sort_by(ballots, fn ballot ->
      title = String.downcase(Map.get(ballot, "title", ""))
      cond do
        String.contains?(title, "president") -> 1
        String.contains?(title, "governor") or String.contains?(title, "gubernatorial") -> 2
        String.contains?(title, "senate") or String.contains?(title, "senator") -> 3
        String.contains?(title, "congress") or String.contains?(title, "representative") -> 4
        String.contains?(title, "mayor") -> 5
        String.contains?(title, "president") and String.contains?(title, "coop") -> 6
        String.contains?(title, "treasurer") -> 7
        String.contains?(title, "secretary") -> 8
        true -> 9
      end
    end)
    
    # Take up to 3 most important ballots for summary
    Enum.take(prioritized, 3)
    |> Enum.map(fn ballot ->
      %{
        title: Map.get(ballot, "title", "Untitled Ballot"),
        candidate_count: length(Map.get(ballot, "candidates", []))
      }
    end)
  end

  defp create_ballot_summary(_), do: []
end

