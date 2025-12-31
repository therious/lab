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
        |> json(%{error: "The election you're trying to vote in could not be found. Please check your election selection and try again."})

      {:error, :token_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Your voting token is invalid or has expired. Please request a new ballot access token from the election page."})

      {:error, :token_already_used} ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "This ballot access token has already been used to submit a vote. Each token can only be used once. If you need to change your vote, please contact the election administrator."})

      {:error, :voting_not_open} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Voting is not yet open for this election. This is a preview token for testing the interface. You can practice with the ballot, but votes cannot be submitted until the voting window opens."})

      {:error, :voting_window_closed} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "The voting window for this election has closed. Votes can no longer be submitted."})

      {:error, changeset} when is_struct(changeset) ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "There was a problem with your ballot data. Please try again or contact support if the problem persists.", details: format_errors(changeset)})

      {:error, reason} when is_binary(reason) ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "An error occurred while submitting your vote: #{reason}. Please try again or contact support if the problem persists."})

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "An unexpected error occurred while submitting your vote. Please try again or contact support if the problem persists.", error_code: inspect(reason)})
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

