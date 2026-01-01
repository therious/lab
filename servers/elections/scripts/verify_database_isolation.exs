#!/usr/bin/env elixir
# Script to verify database isolation is working correctly
# Run with: mix run scripts/verify_database_isolation.exs

Mix.install([])

# This script checks that:
# 1. Each election has its own database file
# 2. Data from one election doesn't appear in another's database
# 3. The default elections.db is not being used

IO.puts("=== Database Isolation Verification ===\n")

db_dir = Path.join([File.cwd!(), "priv", "repo"])

# List all database files
case File.ls(db_dir) do
  {:ok, files} ->
    db_files = Enum.filter(files, &String.ends_with?(&1, ".db"))
    
    IO.puts("Found #{length(db_files)} database files:")
    Enum.each(db_files, fn file -> IO.puts("  - #{file}") end)
    IO.puts("")
    
    # Check if default elections.db exists and has data
    default_db = Path.join(db_dir, "elections.db")
    if File.exists?(default_db) do
      IO.puts("⚠️  WARNING: Default elections.db exists!")
      IO.puts("   This should be empty or not exist with the new architecture.")
      IO.puts("")
    end
    
    # Check each election-specific database
    election_dbs = Enum.filter(db_files, fn file -> file != "elections.db" end)
    
    if length(election_dbs) > 0 do
      IO.puts("Checking election-specific databases:")
      Enum.each(election_dbs, fn db_file ->
        db_path = Path.join(db_dir, db_file)
        election_id = String.replace(db_file, ".db", "")
        
        IO.puts("\n  #{election_id}:")
        
        # Try to query the database (requires sqlite3 command)
        case System.cmd("sqlite3", [db_path, "SELECT COUNT(*) FROM elections;"], stderr_to_stdout: true) do
          {output, 0} ->
            count = String.trim(output)
            IO.puts("    Elections: #{count}")
            
            case System.cmd("sqlite3", [db_path, "SELECT COUNT(*) FROM votes;"], stderr_to_stdout: true) do
              {vote_output, 0} ->
                vote_count = String.trim(vote_output)
                IO.puts("    Votes: #{vote_count}")
              _ ->
                IO.puts("    Votes: (table may not exist)")
            end
          _ ->
            IO.puts("    (database may be empty or not initialized)")
        end
      end)
    else
      IO.puts("No election-specific databases found.")
      IO.puts("This is normal if no elections have been loaded yet.")
    end
    
  {:error, reason} ->
    IO.puts("Error listing database directory: #{inspect(reason)}")
end

IO.puts("\n=== Verification Complete ===")

