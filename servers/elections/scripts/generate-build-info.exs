#!/usr/bin/env elixir
# Generate BuildInfo.json for Elixir server
#
# Captures:
# - First 8 digits of latest commit hash
# - Branch name
# - Authored date
# - Commit date
# - Build date (with time)

Mix.install([{:jason, "~> 1.2"}])

defmodule BuildInfoGenerator do
  def generate do
    git_info = get_git_info()
    build_date = DateTime.utc_now() |> DateTime.to_iso8601()
    
    build_info = %{
      commitHash: git_info[:commit_hash],
      branch: git_info[:branch],
      authorDate: git_info[:author_date],
      commitDate: git_info[:commit_date],
      buildDate: build_date
    }
    
    # Write to priv/static so it can be served, and also to lib for compile-time access
    json_content = Jason.encode!(build_info, pretty: true)
    
    # Write to priv/static for serving via HTTP
    priv_static_path = Path.join([__DIR__, "..", "priv", "static", "build-info.json"])
    File.mkdir_p!(Path.dirname(priv_static_path))
    File.write!(priv_static_path, json_content)
    
    # Write to lib for compile-time module generation
    lib_path = Path.join([__DIR__, "..", "lib", "elections", "build_info.json"])
    File.write!(lib_path, json_content)
    
    IO.puts("BuildInfo.json generated: #{inspect(build_info)}")
    build_info
  end
  
  defp get_git_info do
    try do
      # Get repo root (3 levels up from scripts: scripts -> elections -> servers -> repo root)
      repo_root = Path.expand(Path.join([__DIR__, "..", "..", ".."]))
      
      # Always run git commands from repo root to ensure consistency with UI script
      # This ensures we get the latest commit hash for the entire repo
      commit_hash = System.cmd("git", ["rev-parse", "HEAD"], cd: repo_root)
                    |> elem(0)
                    |> String.trim()
      short_hash = String.slice(commit_hash, 0, 8)
      
      branch = System.cmd("git", ["rev-parse", "--abbrev-ref", "HEAD"], cd: repo_root)
               |> elem(0)
               |> String.trim()
      
      author_date = System.cmd("git", ["log", "-1", "--format=%ai"], cd: repo_root)
                    |> elem(0)
                    |> String.trim()
      
      commit_date = System.cmd("git", ["log", "-1", "--format=%ci"], cd: repo_root)
                    |> elem(0)
                    |> String.trim()
      
      %{
        commit_hash: short_hash,
        branch: branch,
        author_date: author_date,
        commit_date: commit_date
      }
    rescue
      e ->
        IO.warn("Warning: Could not get git info: #{inspect(e)}")
        now = DateTime.utc_now() |> DateTime.to_iso8601()
        %{
          commit_hash: "unknown",
          branch: "unknown",
          author_date: now,
          commit_date: now
        }
    end
  end
end

# Always run when script is executed
BuildInfoGenerator.generate()
