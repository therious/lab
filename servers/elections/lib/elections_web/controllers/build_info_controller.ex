defmodule ElectionsWeb.BuildInfoController do
  use ElectionsWeb, :controller

  alias Elections.BuildInfo

  @doc """
  Returns server build information (commit hash, branch, dates).
  This endpoint is available without authentication, allowing clients to
  fetch build info before login/ballot selection.
  """
  def show(conn, _params) do
    build_info = %{
      commitHash: BuildInfo.commit_hash(),
      branch: BuildInfo.branch(),
      authorDate: BuildInfo.author_date(),
      commitDate: BuildInfo.commit_date(),
      buildDate: BuildInfo.build_date()
    }
    
    conn |> json(build_info)
  end
end
