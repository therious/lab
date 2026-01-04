defmodule Elections.BuildInfo do
  @moduledoc """
  Provides build information (commit hash, branch, dates) for the elections server.
  This information is generated at build time and embedded in the application.
  """
  
  # Load build info from JSON file generated at build time
  # Use absolute path based on source file location
  @build_info_path Path.expand("build_info.json", __DIR__)
  
  # Compile-time constant - loaded once when module is compiled
  # Inline the logic here since module attributes can't call functions defined in the same module
  @build_info (
    case File.read(@build_info_path) do
      {:ok, content} ->
        # Ensure Jason is available before using it
        case Code.ensure_loaded(Jason) do
          {:module, Jason} ->
            try do
              case Jason.decode(content) do
                {:ok, info} -> info
                {:error, _} -> 
                  %{
                    "commitHash" => "unknown",
                    "branch" => "unknown",
                    "authorDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
                    "commitDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
                    "buildDate" => DateTime.utc_now() |> DateTime.to_iso8601()
                  }
              end
            rescue
              _ -> 
                %{
                  "commitHash" => "unknown",
                  "branch" => "unknown",
                  "authorDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
                  "commitDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
                  "buildDate" => DateTime.utc_now() |> DateTime.to_iso8601()
                }
            end
          {:error, _} ->
            # Jason not available at compile time - return default
            %{
              "commitHash" => "unknown",
              "branch" => "unknown",
              "authorDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
              "commitDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
              "buildDate" => DateTime.utc_now() |> DateTime.to_iso8601()
            }
        end
      {:error, _} ->
        %{
          "commitHash" => "unknown",
          "branch" => "unknown",
          "authorDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "commitDate" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "buildDate" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
    end
  )
  
  @doc "Returns the first 8 digits of the commit hash"
  def commit_hash, do: Map.get(@build_info, "commitHash", "unknown")
  
  @doc "Returns the branch name"
  def branch, do: Map.get(@build_info, "branch", "unknown")
  
  @doc "Returns the author date"
  def author_date, do: Map.get(@build_info, "authorDate", "")
  
  @doc "Returns the commit date"
  def commit_date, do: Map.get(@build_info, "commitDate", "")
  
  @doc "Returns the build date"
  def build_date, do: Map.get(@build_info, "buildDate", "")
  
  @doc "Returns all build info as a map"
  def all do
    %{
      commitHash: commit_hash(),
      branch: branch(),
      authorDate: author_date(),
      commitDate: commit_date(),
      buildDate: build_date()
    }
  end
end
