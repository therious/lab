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
    
    # Use Mix.install to run the script with dependencies
    case System.cmd("elixir", ["-r", "mix.exs", script_path], cd: project_root) do
      {output, 0} ->
        Mix.shell().info(output)
        :ok
      {_output, _exit_code} ->
        # Try alternative: run as standalone script
        case System.cmd("elixir", [script_path], cd: project_root) do
          {output2, 0} ->
            Mix.shell().info(output2)
            :ok
          {output2, _exit_code2} ->
            Mix.shell().error("Failed to generate BuildInfo: #{output2}")
            :error
        end
    end
  end
end
