# Repository Architecture Options for Multi-Database Elections

## Overview

We need to support multiple SQLite databases (one per election) with a single `Elections.Repo` module. This document compares the available approaches and their trade-offs.

## Terminology Clarification

### Multitenancy vs. Multi-Database

**Multitenancy** typically refers to:
- **Schema-based multitenancy**: Single database with `tenant_id` columns to separate data
- **Database-based multitenancy**: Multiple databases per tenant (what we're doing)

**Multi-database architecture** (our case):
- Each election has its own SQLite database file
- This is essentially database-based multitenancy, but "multitenant" libraries usually focus on schema-based patterns

### SQLite Considerations

- SQLite doesn't have built-in multitenancy features like PostgreSQL
- Multiple SQLite files = multiple databases (perfect for our use case)
- Each SQLite file is completely isolated
- No need for tenant_id columns or schema separation

## Option 1: Dynamic Repo with `put_dynamic_repo/1` (Recommended)

### How It Works

Ecto supports dynamic repositories where you can start multiple repo processes and switch between them per-process using `put_dynamic_repo/1`.

**Implementation:**
```elixir
# lib/elections/repo.ex
defmodule Elections.Repo do
  use Ecto.Repo,
    otp_app: :elections,
    adapter: Ecto.Adapters.SQLite3
end

# lib/elections/repo_manager.ex
defmodule Elections.RepoManager do
  @repo_cache :elections_repo_cache
  
  def with_repo(election_identifier, fun) do
    repo = get_or_start_repo(election_identifier)
    
    # Set this repo for the current process
    Elections.Repo.put_dynamic_repo(repo)
    
    try do
      fun.(Elections.Repo)
    after
      # Clear dynamic repo (optional, process-local anyway)
      Elections.Repo.put_dynamic_repo(Elections.Repo)
    end
  end
  
  defp get_or_start_repo(election_identifier) do
    # Check cache (ETS table or Agent)
    case :ets.lookup(@repo_cache, election_identifier) do
      [{^election_identifier, repo_pid}] when is_pid(repo_pid) ->
        if Process.alive?(repo_pid) do
          repo_pid
        else
          start_and_cache_repo(election_identifier)
        end
      [] ->
        start_and_cache_repo(election_identifier)
    end
  end
  
  defp start_and_cache_repo(election_identifier) do
    db_path = db_path(election_identifier)
    config = [
      database: db_path,
      pool_size: 1  # SQLite doesn't need connection pooling
    ]
    
    # Start repo with unique name
    repo_name = :"Elections.Repo.#{election_identifier}"
    {:ok, pid} = Elections.Repo.start_link(name: repo_name, config: config)
    
    :ets.insert(@repo_cache, {election_identifier, pid})
    pid
  end
end
```

### Pros
- ✅ **Well-documented pattern**: Official Ecto feature, extensively documented
- ✅ **Process isolation**: Each process can use a different repo without conflicts
- ✅ **Connection pooling**: Each repo manages its own connection pool
- ✅ **Type-safe**: Uses standard Ecto patterns
- ✅ **Works with SQLite**: No special considerations needed
- ✅ **Migration support**: Can run migrations per database easily

### Cons
- ⚠️ **Memory overhead**: One repo process per election (minimal for SQLite)
- ⚠️ **Cache management**: Need to track and clean up repo processes
- ⚠️ **Complexity**: More moving parts than simpler approaches

### When to Use
- **Best for**: Production systems, when you need proper isolation and connection management
- **Good for**: When you have many elections and need efficient connection reuse

## Option 2: Dynamic Config with `init/2` Callback

### How It Works

Use the `init/2` callback to read the database path from process dictionary or other runtime source.

**Implementation:**
```elixir
# lib/elections/repo.ex
defmodule Elections.Repo do
  use Ecto.Repo,
    otp_app: :elections,
    adapter: Ecto.Adapters.SQLite3

  def init(_type, config) do
    # Read database path from process dictionary
    database = Process.get(:election_database) || config[:database]
    {:ok, Keyword.put(config, :database, database)}
  end
end

# lib/elections/repo_manager.ex
def with_repo(election_identifier, fun) do
  db_path = db_path(election_identifier)
  
  # Store in process dictionary
  Process.put(:election_database, db_path)
  
  try do
    # Force reconnection by checking out a connection
    Elections.Repo.checkout(fn ->
      fun.(Elections.Repo)
    end)
  after
    Process.delete(:election_database)
  end
end
```

### Pros
- ✅ **Simple**: Minimal code changes
- ✅ **Single repo process**: Reuses the same repo, just changes database path
- ✅ **Low memory**: Only one repo process

### Cons
- ⚠️ **Connection management**: SQLite connections might not reconnect properly
- ⚠️ **Less documented**: Not the primary pattern for multi-database
- ⚠️ **Potential issues**: May not work reliably with SQLite's connection model
- ⚠️ **Testing complexity**: Harder to verify database isolation

### When to Use
- **Best for**: Simple cases, few elections, when you want minimal changes
- **Avoid if**: You need guaranteed isolation or have many concurrent requests

## Option 3: Separate Repo Modules Per Election

### How It Works

Create a separate repo module for each election dynamically.

**Implementation:**
```elixir
# Generate repo module at runtime
defmodule Elections.RepoManager do
  def with_repo(election_identifier, fun) do
    repo_module = get_repo_module(election_identifier)
    fun.(repo_module)
  end
  
  defp get_repo_module(election_identifier) do
    module_name = :"Elections.Repo.#{String.replace(election_identifier, "-", "_")}"
    
    unless Code.ensure_loaded?(module_name) do
      # Dynamically create module
      db_path = db_path(election_identifier)
      config = [database: db_path]
      
      defmodule module_name do
        use Ecto.Repo,
          otp_app: :elections,
          adapter: Ecto.Adapters.SQLite3
      end
      
      # Start the repo
      {:ok, _} = module_name.start_link(config: config)
    end
    
    module_name
  end
end
```

### Pros
- ✅ **Complete isolation**: Each election has its own module
- ✅ **Type-safe**: Each repo is a proper module

### Cons
- ❌ **Complex**: Dynamic module creation is tricky
- ❌ **Not recommended**: Goes against Elixir best practices
- ❌ **Hard to maintain**: Modules created at runtime are hard to debug

### When to Use
- **Avoid**: Not recommended for this use case

## Option 4: Raw SQLite Connections (No Ecto)

### How It Works

Bypass Ecto entirely and use Exqlite or similar directly.

### Pros
- ✅ **Full control**: Complete control over connections
- ✅ **Simple**: No Ecto abstraction layer

### Cons
- ❌ **Lose Ecto benefits**: No changesets, migrations, query DSL
- ❌ **More code**: Need to write SQL directly
- ❌ **Less maintainable**: More boilerplate

### When to Use
- **Avoid**: Ecto provides too much value to bypass

## Recommendation: Option 1 (Dynamic Repo with `put_dynamic_repo/1`)

### Why This Is Best

1. **Well-supported pattern**: This is the official Ecto way to handle multiple databases
2. **Documentation**: Extensive documentation and examples available
3. **Reliability**: Battle-tested in production systems
4. **SQLite-friendly**: Works perfectly with SQLite's file-based model
5. **Future-proof**: If you ever need to switch to PostgreSQL, the pattern works the same

### Implementation Notes

- Use an ETS table or Agent to cache repo processes
- Clean up unused repos periodically (e.g., elections that haven't been accessed in a while)
- Each repo process is lightweight (SQLite doesn't need connection pooling)
- Process isolation ensures no cross-contamination

### Verification

After implementation, verify:
1. Each election's data is in its own database file
2. No data appears in the default `elections.db`
3. Concurrent requests to different elections work correctly
4. Repo processes are properly cleaned up

## Comparison Table

| Feature | Option 1: `put_dynamic_repo` | Option 2: `init/2` | Option 3: Dynamic Modules | Option 4: Raw SQLite |
|---------|------------------------------|---------------------|---------------------------|----------------------|
| Well-documented | ✅ Yes | ⚠️ Partial | ❌ No | ❌ No |
| Ecto support | ✅ Official | ⚠️ Works | ⚠️ Works | ❌ None |
| Isolation | ✅ Perfect | ⚠️ Good | ✅ Perfect | ✅ Perfect |
| Complexity | ⚠️ Medium | ✅ Low | ❌ High | ⚠️ Medium |
| Memory usage | ⚠️ Medium | ✅ Low | ⚠️ Medium | ✅ Low |
| Maintainability | ✅ High | ⚠️ Medium | ❌ Low | ⚠️ Medium |
| Production-ready | ✅ Yes | ⚠️ Maybe | ❌ No | ⚠️ Maybe |

## Conclusion

**Use Option 1** (`put_dynamic_repo/1`) because:
- It's the official, well-documented Ecto pattern
- It provides guaranteed isolation
- It's production-ready and battle-tested
- The complexity is manageable and worth it for reliability

The slight increase in complexity is justified by the reliability and maintainability benefits.

