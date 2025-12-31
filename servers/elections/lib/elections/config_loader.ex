defmodule Elections.ConfigLoader do
  @moduledoc """
  Loads election configurations from YAML files.
  """

  alias Elections.Repo
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
        error
    end
  end

  defp load_election_file(path) do
    case YamlElixir.read_from_file(path) do
      {:ok, config} ->
        elections = Map.get(config, "elections", [])

        Enum.each(elections, fn election_config ->
          create_or_update_election(election_config)
        end)

      error ->
        IO.puts("Error loading #{path}: #{inspect(error)}")
    end
  end

  defp create_or_update_election(election_config) do
    identifier = Map.get(election_config, "identifier") || generate_identifier(election_config)

    # Parse dates (assuming ISO 8601 format or relative dates)
    voting_start = parse_date(Map.get(election_config, "voting_start"))
    voting_end = parse_date(Map.get(election_config, "voting_end"))
    service_start = parse_date(Map.get(election_config, "service_start")) || voting_end
    service_end = parse_date(Map.get(election_config, "service_end"))

    number_of_winners = Map.get(election_config, "number_of_winners", 1)

    attrs = %{
      identifier: identifier,
      config: election_config,
      number_of_winners: number_of_winners,
      voting_start: voting_start,
      voting_end: voting_end,
      service_start: service_start,
      service_end: service_end
    }

    case Repo.get_by(Election, identifier: identifier) do
      nil ->
        Election.changeset(%Election{}, attrs) |> Repo.insert!()

      existing ->
        Election.changeset(existing, attrs) |> Repo.update!()
    end
  end

  defp generate_identifier(election_config) do
    title = Map.get(election_config, "title", "Untitled Election")
    title |> String.downcase() |> String.replace(" ", "-") |> String.replace(~r/[^a-z0-9-]/, "")
  end

  defp parse_date(nil), do: DateTime.utc_now()

  defp parse_date(date_string) when is_binary(date_string) do
    case DateTime.from_iso8601(date_string) do
      {:ok, datetime, _} -> datetime
      _ -> DateTime.utc_now()
    end
  end

  defp parse_date(%DateTime{} = datetime), do: datetime
  defp parse_date(_), do: DateTime.utc_now()
end

