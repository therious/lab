defmodule Elections.TokenGenerator do
  @moduledoc """
  Helper module for generating test tokens in development.
  """

  alias Elections.Repo
  alias Elections.VoteToken
  alias Elections.Election

  def generate_test_token(election_identifier) do
    case Repo.get_by(Election, identifier: election_identifier) do
      nil ->
        {:error, :election_not_found}

      election ->
        token = generate_uuid()
        view_token = generate_uuid()

        changeset =
          VoteToken.changeset(%VoteToken{}, %{
            token: token,
            election_id: election.id,
            view_token: view_token,
            used: false
          })

        case Repo.insert(changeset) do
          {:ok, vote_token} ->
            {:ok, %{token: token, view_token: view_token, vote_token_id: vote_token.id}}

          error ->
            error
        end
    end
  end

  defp generate_uuid do
    # Simple UUID v4 generation
    <<u0::48, _::4, u1::12, _::2, u2::62>> = :crypto.strong_rand_bytes(16)
    <<u0::48, 4::4, u1::12, 2::2, u2::62>>
    |> Base.encode16(case: :lower)
    |> String.downcase()
    |> then(fn hex ->
      String.slice(hex, 0, 8) <> "-" <>
        String.slice(hex, 8, 4) <> "-" <>
        String.slice(hex, 12, 4) <> "-" <>
        String.slice(hex, 16, 4) <> "-" <>
        String.slice(hex, 20, 12)
    end)
  end
end

