#!/usr/bin/env elixir

# Quick script to verify votes exist in database
# Usage: mix run scripts/verify_votes.exs [election_identifier]

election_identifier = System.argv() |> List.first() || "walnut-hills-high-school-2025"

IO.puts("\n=== Verifying Votes for: #{election_identifier} ===\n")

case Elections.Elections.get_election(election_identifier) do
  {:ok, election} ->
    db_path = Elections.RepoManager.db_path(election_identifier)
    IO.puts("Database: #{db_path}")
    IO.puts("Exists: #{File.exists?(db_path)}\n")
    
    Elections.RepoManager.with_repo(election_identifier, fn repo ->
      vote_count = repo.aggregate(Ecto.Query.from(v in Elections.Vote), :count, :id)
      IO.puts("Total votes: #{vote_count}")
      
      if vote_count > 0 do
        votes = repo.all(Ecto.Query.from(v in Elections.Vote, limit: 5))
        IO.puts("\nSample votes:")
        Enum.each(votes, fn vote ->
          ballot_keys = Map.keys(vote.ballot_data || %{})
          IO.puts("  Vote #{vote.id}: #{length(ballot_keys)} ballots, inserted: #{vote.inserted_at}")
        end)
      else
        IO.puts("\n⚠ No votes found in database!")
        IO.puts("This election may need test data or votes to be submitted.")
      end
    end)
    
  {:error, _} ->
    IO.puts("✗ Election not found")
end

IO.puts("\n")

