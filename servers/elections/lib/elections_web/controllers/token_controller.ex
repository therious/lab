defmodule ElectionsWeb.TokenController do
  use ElectionsWeb, :controller

  alias Elections.TokenGenerator
  alias Elections.Repo
  alias Elections.Election

  def create(conn, %{"election_identifier" => election_identifier}) do
    case TokenGenerator.generate_test_token(election_identifier) do
      {:ok, tokens} ->
        conn
        |> put_status(:created)
        |> json(%{status: "success", tokens: tokens})

      {:error, :election_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})
    end
  end

  # Debug endpoint: get token for any election by identifier or title
  def debug_get_token(conn, params) do
    election_identifier = Map.get(params, "election_identifier") || Map.get(params, "election_title")

    case find_election(election_identifier) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Election not found"})

      election ->
        case TokenGenerator.generate_test_token(election.identifier) do
          {:ok, tokens} ->
            conn
            |> put_status(:ok)
            |> json(%{
              status: "success",
              election_id: election.id,
              election_identifier: election.identifier,
              tokens: tokens
            })

          error ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "Failed to generate token", details: inspect(error)})
        end
    end
  end

  defp find_election(identifier) when is_binary(identifier) do
    Repo.get_by(Election, identifier: identifier) ||
      Repo.one(
        from(e in Election,
          where: fragment("?->>'title' = ?", e.config, ^identifier)
        )
      )
  end

  defp find_election(_), do: nil
end

