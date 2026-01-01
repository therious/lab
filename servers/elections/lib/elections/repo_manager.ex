defmodule Elections.RepoManager do
  @moduledoc """
  Manages election-specific database repositories.
  Each election has its own SQLite database instance.
  
  Uses Ecto's dynamic repo pattern with `put_dynamic_repo/1` to ensure
  proper database isolation. Each election gets its own repo process
  that is cached and reused.
  """

  @db_dir Path.join([:code.priv_dir(:elections), "repo"])
  @migrations_path Path.join([:code.priv_dir(:elections), "repo", "migrations"])
  @repo_cache_table :elections_repo_cache

  @doc """
  Initialize the repo cache. Should be called during application startup.
  """
  def init_cache do
    # Create ETS table to cache repo processes
    # Public table so other processes can read it
    # Named table so it persists across process restarts
    case :ets.whereis(@repo_cache_table) do
      :undefined ->
        :ets.new(@repo_cache_table, [:set, :public, :named_table])
      _pid ->
        :ok
    end
  end

  @doc """
  Get the database path for an election identifier.
  """
  def db_path(election_identifier) when is_binary(election_identifier) do
    Path.join(@db_dir, "#{sanitize_identifier(election_identifier)}.db")
  end

  @doc """
  Execute a function with the repo configured for a specific election.
  Uses Ecto's dynamic repo pattern to ensure proper database isolation.
  """
  def with_repo(election_identifier, fun) when is_binary(election_identifier) and is_function(fun, 1) do
    # Ensure cache is initialized
    init_cache()
    
    # Ensure database directory exists
    File.mkdir_p!(@db_dir)
    
    # Get or start the repo for this election
    repo = get_or_start_repo(election_identifier)
    
    # Set this repo as the dynamic repo for the current process
    Elections.Repo.put_dynamic_repo(repo)
    
    try do
      fun.(Elections.Repo)
    after
      # Clear dynamic repo (optional, but good practice)
      # The dynamic repo is process-local anyway, so this is just cleanup
      Elections.Repo.put_dynamic_repo(Elections.Repo)
    end
  end

  @doc """
  Get or start a repo process for an election identifier.
  Repos are cached in an ETS table and reused across requests.
  """
  def get_or_start_repo(election_identifier) when is_binary(election_identifier) do
    init_cache()
    
    case :ets.lookup(@repo_cache_table, election_identifier) do
      [{^election_identifier, repo_pid}] when is_pid(repo_pid) ->
        # Check if process is still alive
        if Process.alive?(repo_pid) do
          repo_pid
        else
          # Process died, remove from cache and start new one
          :ets.delete(@repo_cache_table, election_identifier)
          start_and_cache_repo(election_identifier)
        end
      
      [] ->
        # No cached repo, start a new one
        start_and_cache_repo(election_identifier)
    end
  end

  defp start_and_cache_repo(election_identifier) do
    db_path = db_path(election_identifier)
    
    # Ensure database file exists
    File.mkdir_p!(@db_dir)
    if not File.exists?(db_path) do
      File.touch!(db_path)
    end
    
    # Create unique name for this repo process
    repo_name = :"Elections.Repo.#{sanitize_identifier(election_identifier)}"
    
    # Get base config and override database path
    base_config = Application.get_env(:elections, Elections.Repo, [])
    # Merge database path into config - config options are passed directly to start_link
    config = Keyword.merge(base_config, [database: db_path])
    
    # Start the repo with the specific database
    # Config options are passed directly, not wrapped in a :config key
    case Elections.Repo.start_link([name: repo_name] ++ config) do
      {:ok, pid} ->
        # Run migrations if needed
        if File.exists?(@migrations_path) do
          # Temporarily set this repo as dynamic to run migrations
          Elections.Repo.put_dynamic_repo(pid)
          try do
            Ecto.Migrator.run(Elections.Repo, @migrations_path, :up, all: true)
          after
            Elections.Repo.put_dynamic_repo(Elections.Repo)
          end
        end
        
        # Cache the repo process
        :ets.insert(@repo_cache_table, {election_identifier, pid})
        pid
      
      {:error, {:already_started, pid}} ->
        # Repo already started (race condition), just cache it
        :ets.insert(@repo_cache_table, {election_identifier, pid})
        pid
      
      {:error, reason} ->
        require Logger
        Logger.error("Failed to start repo for election #{election_identifier}: #{inspect(reason)}")
        raise "Failed to start repo for election #{election_identifier}: #{inspect(reason)}"
    end
  end

  @doc """
  List all election identifiers that have databases.
  """
  def list_elections do
    case File.ls(@db_dir) do
      {:ok, files} ->
        files
        |> Enum.filter(&String.ends_with?(&1, ".db"))
        |> Enum.map(&String.replace(&1, ".db", ""))
        |> Enum.sort()

      {:error, _} ->
        []
    end
  end

  @doc """
  Create and initialize a new election database.
  The repo will be started automatically when first accessed via with_repo/2.
  """
  def create_election_db(election_identifier) when is_binary(election_identifier) do
    File.mkdir_p!(@db_dir)
    db_path = db_path(election_identifier)
    # Just create the database file - migrations will run when repo is first used
    if not File.exists?(db_path) do
      File.touch!(db_path)
    end
    :ok
  end

  @doc """
  Clean up dead repo processes from the cache.
  Useful for maintenance, but not required for normal operation.
  """
  def cleanup_dead_repos do
    init_cache()
    
    :ets.foldl(
      fn {election_identifier, pid}, acc ->
        if Process.alive?(pid) do
          acc
        else
          :ets.delete(@repo_cache_table, election_identifier)
          [election_identifier | acc]
        end
      end,
      [],
      @repo_cache_table
    )
  end

  defp sanitize_identifier(identifier) do
    # Sanitize identifier for use in file paths
    identifier
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9_-]/, "-")
    |> String.replace(~r/-+/, "-")
  end
end

