defmodule ElectionsWeb.VoteController do
  use ElectionsWeb, :controller

  alias Elections.Voting

  def submit(conn, %{"election_identifier" => election_identifier, "token" => token, "ballot_data" => ballot_data}) do
    case Voting.submit_vote(election_identifier, token, ballot_data) do
      {:ok, view_token} ->
        conn
        |> put_status(:created)
        |> json(%{status: "success", view_token: view_token})

      {:error, :election_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})

      {:error, :token_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Invalid token"})

      {:error, :token_already_used} ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "Token has already been used"})

      {:error, :voting_not_open} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Voting is not yet open for this election. This is a preview token for testing the interface."})

      {:error, :voting_window_closed} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Voting window is closed"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Invalid ballot data", details: format_errors(changeset)})
    end
  end

  def view(conn, %{"election_identifier" => election_identifier, "token" => token, "view_token" => view_token}) do
    case Voting.view_vote(election_identifier, token, view_token) do
      {:ok, vote} ->
        conn
        |> put_status(:ok)
        |> json(%{status: "success", vote: vote})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Vote not found or tokens do not match"})
    end
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end

