# Issues and Fixes Analysis

## Issue 1: Multiple Elections' Data in Same Database

### Problem
All elections' data (votes, tokens, elections) are being stored in the default `priv/repo/elections.db` file instead of separate databases per election.

**Evidence:**
```bash
sqlite3 priv/repo/elections.db "SELECT identifier, COUNT(*) FROM elections e LEFT JOIN votes v ON e.id = v.election_id GROUP BY e.identifier;"
# Shows: 2026-general-election|1, congregation-anshei-kartoffel-2026|1, riverside-coop-2026|3, walnut-hills-high-school-2025|110
```

### Root Cause
The `RepoManager.with_repo/2` function attempts to change the database path by modifying `Application.put_env`, but this doesn't work because:

1. **Ecto.Repo is a persistent process**: When `Elections.Repo` is started in the supervision tree (line 16 of `application.ex`), it connects to the database specified in the config at startup (`priv/repo/elections.db`).

2. **Config changes don't reconnect**: Changing `Application.put_env(:elections, Elections.Repo, new_config)` at runtime doesn't cause the repo process to disconnect and reconnect to a new database file. The SQLite3 adapter maintains its connection to the original database.

3. **All queries use the same connection**: Even though we change the config, all queries through `Elections.Repo` still use the original database connection.

### Solution Options

#### Option A: Use Ecto's Dynamic Repo Configuration (Recommended)
Ecto supports dynamic repo configuration via the `init/2` callback. This allows the repo to read config at query time rather than connection time.

**Implementation:**
```elixir
# lib/elections/repo.ex
defmodule Elections.Repo do
  use Ecto.Repo,
    otp_app: :elections,
    adapter: Ecto.Adapters.SQLite3

  def init(_type, config) do
    # Allow database path to be overridden per-query via process dictionary
    database = Process.get(:election_database) || config[:database]
    {:ok, Keyword.put(config, :database, database)}
  end
end

# lib/elections/repo_manager.ex
def with_repo(election_identifier, fun) do
  db_path = db_path(election_identifier)
  
  # Store database path in process dictionary
  Process.put(:election_database, db_path)
  
  try do
    # Force repo to reconnect by checking out a connection
    Elections.Repo.checkout(fn ->
      fun.(Elections.Repo)
    end)
  after
    Process.delete(:election_database)
  end
end
```

#### Option B: Create Separate Repo Processes Per Election
Create a repo process for each election database and manage them dynamically.

**Implementation:**
```elixir
# Create a dynamic supervisor for election repos
# Store repo processes in a registry
# Use the appropriate repo process for each election
```

#### Option C: Use Raw SQLite Connections
Bypass Ecto and use direct SQLite connections, but this loses Ecto's benefits.

### Verification Steps
1. **Check database isolation:**
   ```bash
   # Each election should have its own database file
   ls -lh priv/repo/*.db
   
   # Each database should only contain data for one election
   for db in priv/repo/*-*.db; do
     echo "=== $db ==="
     sqlite3 "$db" "SELECT identifier FROM elections;"
     sqlite3 "$db" "SELECT COUNT(*) FROM votes;"
   done
   ```

2. **Verify no cross-contamination:**
   ```bash
   # The default elections.db should be empty or not exist
   sqlite3 priv/repo/elections.db "SELECT COUNT(*) FROM elections;" 2>/dev/null || echo "Should be empty or not exist"
   ```

3. **Test vote submission:**
   - Submit a vote for election A
   - Verify it appears only in election A's database
   - Verify it does NOT appear in election B's database

## Issue 2: "Error occurred while calculating results"

### Problem
Results calculation still fails with "error occurred while calculating results" even after error handling improvements.

### Root Cause
The error handling wraps `calculate_all_results` in try/rescue, but the actual error might be:

1. **Database connection issue**: The repo is querying the wrong database (see Issue 1), so it might not find the election or votes.

2. **Election not found in wrong database**: When querying `election_id` in the default database, the election might not exist there (it's in the election-specific database).

3. **Error occurs before try/rescue**: The error might be in `ElectionsContext.get_election` which is called before the try block.

4. **Error in build_partial_results_on_error**: The fallback function might also be failing.

### Solution
1. **Fix database isolation first** (Issue 1) - this will likely fix the results error too.

2. **Add more granular error handling:**
   ```elixir
   def get_election_results(election_identifier) do
     RepoManager.with_repo(election_identifier, fn repo ->
       try do
         case ElectionsContext.get_election(election_identifier) do
           {:ok, election} ->
             try do
               results = calculate_all_results(repo, election)
               {:ok, results}
             rescue
               e -> handle_calculation_error(repo, election, e)
             end
           error -> error
         end
       rescue
         e -> handle_repo_error(election_identifier, e)
       end
     end)
   end
   ```

3. **Add logging at each step** to identify where exactly the error occurs.

### Verification Steps
1. **Check server logs** for the actual error message and stack trace.

2. **Test with empty election:**
   ```bash
   # Should return empty results, not an error
   curl http://localhost:4000/api/dashboard/{identifier}
   ```

3. **Test with election that has votes:**
   ```bash
   # Should return results with vote counts and algorithm results
   curl http://localhost:4000/api/dashboard/{identifier}
   ```

4. **Test error handling:**
   - Temporarily break an algorithm
   - Verify partial results are returned, not a 500 error

## How to Verify Fixes Before Completion

### Database Isolation Verification
1. **Before fix**: All elections' data in `elections.db`
2. **After fix**: Each election has its own `.db` file with only its data
3. **Test**: Submit votes to different elections, verify isolation

### Results Calculation Verification
1. **Test empty election**: Should return empty results structure
2. **Test election with votes**: Should return complete results
3. **Test election with algorithm errors**: Should return partial results with error status
4. **Check logs**: No unhandled exceptions
5. **Check frontend**: Shows partial results even when errors occur

### General Verification Checklist
- [ ] Each election has its own database file
- [ ] Votes for election A don't appear in election B's database
- [ ] Results calculation works for empty elections
- [ ] Results calculation works for elections with votes
- [ ] Results calculation returns partial results on algorithm errors
- [ ] Frontend displays partial results with error indicators
- [ ] Server logs show no unhandled exceptions
- [ ] All API endpoints return proper JSON (not HTML errors)

## ✅ IMPLEMENTATION STATUS

### Issue 1: FIXED (Commit 8631e65)

The dynamic repo pattern has been implemented:
- **RepoManager**: Now uses `put_dynamic_repo/1` with ETS caching
- **Application**: Removed default repo from supervision, initialize cache on startup
- **Isolation**: Each election now has its own repo process and database file

### Issue 2: Should be fixed (needs testing)

With proper database isolation, results calculation should work correctly. The error was likely caused by querying the wrong database.

### Verification

Run the verification script:
```bash
cd servers/elections
mix run scripts/verify_database_isolation.exs
```

## Recommended Fix Order

1. ✅ **Fix database isolation** (Issue 1) - COMPLETE
2. **Test results calculation** - Verify Issue 2 is resolved
3. **Add comprehensive error logging** - If issues persist
4. **Add verification tests** - To prevent regression

