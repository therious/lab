defmodule Mix.Tasks.Buildinfo.Generate do
  @shortdoc "Generate BuildInfo.json for the elections server"
  @moduledoc """
  Generates BuildInfo.json containing commit hash, branch, and date information.
  This is called automatically during compilation.
  """
  
  use Mix.Task
  
  def run(_args) do
    Mix.shell().info("Generating BuildInfo.json...")
    
    # Get the project root directory
    project_root = File.cwd!()
    script_path = Path.join([project_root, "scripts", "generate-build-info.exs"])
    
    # Run as standalone script (Mix.install handles dependencies)
    case System.cmd("elixir", [script_path], cd: project_root) do
      {output, 0} ->
        Mix.shell().info(output)
        :ok
      {output, exit_code} ->
        Mix.shell().error("Failed to generate BuildInfo (exit code #{exit_code}): #{output}")
        :error
    end
  end
end
