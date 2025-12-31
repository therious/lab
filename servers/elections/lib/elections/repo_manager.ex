defmodule Elections.RepoManager do
  @moduledoc """
  Manages election-specific database repositories.
  Each election has its own SQLite database instance.
  
  Provides helper functions to work with election-specific databases.
  """

  @db_dir Path.join([:code.priv_dir(:elections), "repo"])
  @migrations_path Path.join([:code.priv_dir(:elections), "repo", "migrations"])

  @doc """
  Get the database path for an election identifier.
  """
  def db_path(election_identifier) when is_binary(election_identifier) do
    Path.join(@db_dir, "#{sanitize_identifier(election_identifier)}.db")
  end

  @doc """
  Execute a function with the repo configured for a specific election.
  This temporarily configures the repo's database path.
  """
  def with_repo(election_identifier, fun) when is_binary(election_identifier) and is_function(fun, 1) do
    # Ensure database directory exists
    File.mkdir_p!(@db_dir)
    
    db_path = db_path(election_identifier)
    
    # Store original config
    original_config = Application.get_env(:elections, Elections.Repo, [])
    
    # Configure repo for this election
    new_config = Keyword.put(original_config, :database, db_path)
    Application.put_env(:elections, Elections.Repo, new_config)
    
    # Ensure database exists and is migrated
    if not File.exists?(db_path) do
      ensure_migrations()
      run_migrations(election_identifier, db_path)
    end
    
    try do
      fun.(Elections.Repo)
    after
      # Restore original config
      Application.put_env(:elections, Elections.Repo, original_config)
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
  """
  def create_election_db(election_identifier) when is_binary(election_identifier) do
    File.mkdir_p!(@db_dir)
    db_path = db_path(election_identifier)
    ensure_migrations()
    run_migrations(election_identifier, db_path)
    :ok
  end

  defp run_migrations(_election_identifier, db_path) do
    # Temporarily configure repo for migrations
    original_config = Application.get_env(:elections, Elections.Repo, [])
    new_config = Keyword.put(original_config, :database, db_path)
    Application.put_env(:elections, Elections.Repo, new_config)
    
    try do
      if File.exists?(@migrations_path) do
        Ecto.Migrator.run(Elections.Repo, @migrations_path, :up, all: true)
      end
    after
      Application.put_env(:elections, Elections.Repo, original_config)
    end
  end

  defp ensure_migrations do
    # Migrations should already exist in priv/repo/migrations
    if not File.exists?(@migrations_path) do
      IO.puts("Warning: Migrations directory not found at #{@migrations_path}")
    end
  end

  defp sanitize_identifier(identifier) do
    # Sanitize identifier for use in file paths
    identifier
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9_-]/, "-")
    |> String.replace(~r/-+/, "-")
  end
end

