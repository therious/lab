defmodule ElectionsWeb.TokenController do
  use ElectionsWeb, :controller

  alias Elections.TokenGenerator

  @doc """
  Request a token for an election.
  Requires email and election_identifier.
  """
  def create(conn, params) do
    election_identifier = Map.get(params, "election_identifier")
    email = Map.get(params, "email")

    cond do
      is_nil(election_identifier) ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Missing election_identifier"})

      is_nil(email) ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Missing email"})

      true ->
        case TokenGenerator.generate_token(election_identifier, email) do
          {:ok, tokens} ->
            conn
            |> put_status(:created)
            |> json(%{status: "success", token: tokens.token, view_token: tokens.view_token})

          {:error, :election_not_found} ->
            conn
            |> put_status(:not_found)
            |> json(%{error: "Election not found"})

          {:error, :invalid_email_format} ->
            conn
            |> put_status(:bad_request)
            |> json(%{error: "Invalid email format"})

          {:error, :not_registered} ->
            conn
            |> put_status(:forbidden)
            |> json(%{error: "Email address is not registered for this election"})

          {:error, :already_voted} ->
            conn
            |> put_status(:forbidden)
            |> json(%{error: "You have already voted in this election"})

          error ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "Failed to generate token", details: inspect(error)})
        end
    end
  end

  # Debug endpoint: get token for any election (for testing)
  def debug_get_token(conn, params) do
    election_identifier = Map.get(params, "election_identifier")

    if is_nil(election_identifier) do
      conn
      |> put_status(:bad_request)
      |> json(%{error: "Missing election_identifier"})
    else
      case TokenGenerator.generate_test_token(election_identifier) do
        {:ok, tokens} ->
          conn
          |> put_status(:ok)
          |> json(%{
            status: "success",
            election_identifier: election_identifier,
            tokens: tokens
          })

        {:error, :election_not_found} ->
          conn
          |> put_status(:not_found)
          |> json(%{error: "Election not found"})

        error ->
          conn
          |> put_status(:internal_server_error)
          |> json(%{error: "Failed to generate token", details: inspect(error)})
      end
    end
  end
end
