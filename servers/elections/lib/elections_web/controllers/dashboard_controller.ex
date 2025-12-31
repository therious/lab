defmodule ElectionsWeb.DashboardController do
  use ElectionsWeb, :controller

  alias Elections.Voting

  def index(conn, _params) do
    elections = Voting.list_available_elections()
    conn |> json(%{elections: elections})
  end

  def show(conn, %{"id" => election_id}) do
    case Voting.get_election_results(election_id) do
      {:ok, results} ->
        conn |> json(%{election_id: election_id, results: results})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})

      {:error, :service_window_not_open} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Results are not yet available"})
    end
  end

  def tally(conn, %{"id" => election_id}) do
    case Voting.get_election_tally(election_id) do
      {:ok, tally} ->
        conn |> json(%{election_id: election_id, tally: tally})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})
    end
  end

  def visualize(conn, %{"id" => election_id, "method" => method}) do
    case Voting.visualize_results(election_id, method) do
      {:ok, visualization} ->
        conn |> json(%{election_id: election_id, method: method, visualization: visualization})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election or method not found"})
    end
  end
end

