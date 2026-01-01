#!/usr/bin/env elixir

# Debug script to check why results aren't showing
# Run with: mix run scripts/debug_results.exs [election_identifier]

Code.require_file("lib/elections.ex")
Code.require_file("lib/elections/voting.ex")
Code.require_file("lib/elections/repo_manager.ex")

election_identifier = System.argv() |> List.first() || "walnut-hills-high-school-2025"

IO.puts("\n=== Debugging Results for: #{election_identifier} ===\n")

# Check if election exists
case Elections.Elections.get_election(election_identifier) do
  {:ok, election} ->
    IO.puts("✓ Election found: #{election.title}")
    IO.puts("  ID: #{election.id}")
    IO.puts("  Voting start: #{election.voting_start}")
    IO.puts("  Voting end: #{election.voting_end}")
    IO.puts("  Config ballots: #{length(Map.get(election.config || %{}, "ballots", []))}")
    
    # Check database path
    db_path = Elections.RepoManager.db_path(election_identifier)
    IO.puts("\n  Database path: #{db_path}")
    IO.puts("  Database exists: #{File.exists?(db_path)}")
    
    # Check votes in database
    Elections.RepoManager.with_repo(election_identifier, fn repo ->
      vote_count = repo.aggregate(Elections.Vote, :count, :id)
      IO.puts("\n  Votes in database: #{vote_count}")
      
      if vote_count > 0 do
        votes = repo.all(Ecto.Query.from(v in Elections.Vote, limit: 3))
        IO.puts("  Sample votes:")
        Enum.each(votes, fn vote ->
          IO.puts("    - Vote ID: #{vote.id}, inserted_at: #{vote.inserted_at}")
        end)
      end
    end)
    
    # Try to get results
    IO.puts("\n=== Attempting to get results ===")
    case Elections.Voting.get_election_results(election_identifier) do
      {:ok, results} ->
        IO.puts("✓ Results retrieved successfully")
        IO.puts("\nResults structure:")
        IO.inspect(results, limit: :infinity, pretty: true)
        
        # Check if results has the expected structure
        ballots = get_in(results, [:results]) || get_in(results, ["results"]) || []
        metadata = get_in(results, [:metadata]) || get_in(results, ["metadata"]) || %{}
        
        IO.puts("\n=== Analysis ===")
        IO.puts("Ballots count: #{length(ballots)}")
        IO.puts("Metadata keys: #{inspect(Map.keys(metadata))}")
        IO.puts("Total votes in metadata: #{Map.get(metadata, :total_votes) || Map.get(metadata, "total_votes") || "N/A"}")
        
        if length(ballots) == 0 do
          IO.puts("\n⚠ PROBLEM: No ballots in results!")
          IO.puts("This means calculate_all_results returned an empty ballots array.")
        end
        
      {:error, reason} ->
        IO.puts("✗ Error getting results: #{inspect(reason)}")
    end
    
  {:error, :election_not_found} ->
    IO.puts("✗ Election not found: #{election_identifier}")
    IO.puts("\nAvailable elections:")
    Elections.Elections.list_available_elections()
    |> Enum.each(fn e -> IO.puts("  - #{e.identifier}: #{e.title}") end)
end

IO.puts("\n")

