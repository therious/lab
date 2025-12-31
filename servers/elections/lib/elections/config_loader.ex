defmodule Elections.ConfigLoader do
  @moduledoc """
  Loads election configurations from YAML files.
  Each YAML file represents one election with multiple ballots.
  """

  alias Elections.RepoManager
  alias Elections.Election

  def load_elections_from_yaml do
    config_dir = Path.join([:code.priv_dir(:elections), "elections"])

    case File.ls(config_dir) do
      {:ok, files} ->
        yaml_files = Enum.filter(files, &String.ends_with?(&1, [".yaml", ".yml"]))

        Enum.each(yaml_files, fn file ->
          path = Path.join(config_dir, file)
          load_election_file(path)
        end)

      {:error, :enoent} ->
        # Directory doesn't exist yet, that's okay
        :ok

      error ->
        IO.puts("Error listing elections directory: #{inspect(error)}")
        error
    end
  end

  defp load_election_file(path) do
    case YamlElixir.read_from_file(path) do
      {:ok, election_config} ->
        create_or_update_election(election_config)

      error ->
        IO.puts("Error loading #{path}: #{inspect(error)}")
    end
  end

  defp create_or_update_election(election_config) do
    # Handle both old format (with "elections" array) and new format (direct election config)
    if Map.has_key?(election_config, "elections") do
      # Old format - skip it (we'll delete these files)
      IO.puts("Warning: Skipping old format config file. Please use new format (one election per file).")
      :ok
    else
      do_create_or_update_election(election_config)
    end
  end

  defp do_create_or_update_election(election_config) do
    identifier = Map.get(election_config, "identifier") || generate_identifier(election_config)

    # Parse dates (assuming ISO 8601 format)
    voting_start = parse_date(Map.get(election_config, "voting_start"))
    voting_end = parse_date(Map.get(election_config, "voting_end"))
    service_start = parse_date(Map.get(election_config, "service_start")) || voting_end
    service_end = parse_date(Map.get(election_config, "service_end"))

    # Validate required fields
    if is_nil(voting_start) || is_nil(voting_end) || is_nil(service_start) do
      IO.puts("Error: Election #{identifier} is missing required date fields (voting_start, voting_end, service_start)")
      :error
    else
      # Create election-specific database
      RepoManager.create_election_db(identifier)

      # Store election metadata and ballots in the election's database
      RepoManager.with_repo(identifier, fn repo ->
        attrs = %{
          identifier: identifier,
          config: election_config,  # Store full config including ballots
        voting_start: voting_start,
        voting_end: voting_end,
        service_start: service_start,
        service_end: service_end
      }

      case repo.get_by(Election, identifier: identifier) do
        nil ->
          Election.changeset(%Election{}, attrs) |> repo.insert!()

        existing ->
          Election.changeset(existing, attrs) |> repo.update!()
      end
    end)
    :ok
    end
  end

  defp generate_identifier(election_config) do
    title = Map.get(election_config, "title", "Untitled Election")
    title |> String.downcase() |> String.replace(" ", "-") |> String.replace(~r/[^a-z0-9-]/, "")
  end

  defp parse_date(nil), do: nil

  defp parse_date(date_string) when is_binary(date_string) do
    case DateTime.from_iso8601(date_string) do
      {:ok, datetime, _} -> datetime
      _ -> 
        IO.puts("Warning: Invalid date format: #{date_string}")
        nil
    end
  end

  defp parse_date(%DateTime{} = datetime), do: datetime
  defp parse_date(_), do: nil
end

