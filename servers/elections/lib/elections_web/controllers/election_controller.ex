defmodule ElectionsWeb.ElectionController do
  use ElectionsWeb, :controller

  alias Elections.Elections

  def index(conn, _params) do
    elections = Elections.list_available_elections()
    conn |> json(%{elections: elections})
  end

  def show(conn, %{"identifier" => identifier}) do
    case Elections.get_election_with_ballots(identifier) do
      {:ok, election} ->
        conn |> json(%{
          identifier: election.identifier,
          title: Map.get(election.config, "title"),
          description: Map.get(election.config, "description"),
          voting_start: election.voting_start,
          voting_end: election.voting_end,
          service_start: election.service_start,
          service_end: election.service_end,
          ballots: election.ballots
        })

      {:error, :election_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})
    end
  end
end

