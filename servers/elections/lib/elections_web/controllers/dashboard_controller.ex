defmodule ElectionsWeb.DashboardController do
  use ElectionsWeb, :controller

  alias Elections.Voting

  def index(conn, _params) do
    elections = Voting.list_available_elections()
    conn |> json(%{elections: elections})
  end

  def show(conn, %{"identifier" => election_identifier}) do
    try do
      case Voting.get_election_results(election_identifier) do
        {:ok, results} ->
          conn |> json(%{election_identifier: election_identifier, results: results})

        {:error, :election_not_found} ->
          conn
          |> put_status(:not_found)
          |> json(%{error: "Election not found", error_code: "election_not_found"})

        {:error, :service_window_not_open} ->
          conn
          |> put_status(:forbidden)
          |> json(%{error: "Results are not yet available", error_code: "service_window_not_open"})

        {:error, reason} when is_binary(reason) ->
          conn
          |> put_status(:internal_server_error)
          |> json(%{error: reason, error_code: "calculation_error"})
        
        {:error, reason} ->
          conn
          |> put_status(:internal_server_error)
          |> json(%{error: "An error occurred while calculating the election results. Please try again later or contact support if the problem persists.", error_code: "calculation_error", debug_info: inspect(reason)})
      end
    rescue
      e ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{
          error: "An error occurred while calculating results",
          error_code: "server_error",
          error_message: Exception.message(e)
        })
    end
  end

  def tally(conn, %{"identifier" => election_identifier}) do
    case Voting.get_election_tally(election_identifier) do
      {:ok, tally} ->
        conn |> json(%{election_identifier: election_identifier, tally: tally})

      {:error, :election_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})
    end
  end

  def visualize(conn, %{"identifier" => election_identifier, "method" => method}) do
    case Voting.visualize_results(election_identifier, method) do
      {:ok, visualization} ->
        conn |> json(%{election_identifier: election_identifier, method: method, visualization: visualization})

      {:error, :election_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election or method not found"})
    end
  end
end

