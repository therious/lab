defmodule ElectionsWeb.TokenController do
  use ElectionsWeb, :controller

  alias Elections.TokenGenerator

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
end

