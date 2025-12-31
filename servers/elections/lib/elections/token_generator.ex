defmodule Elections.TokenGenerator do
  @moduledoc """
  Helper module for generating voting tokens.
  """

  alias Elections.RepoManager
  alias Elections.Elections, as: ElectionsContext
  alias Elections.VoteToken

  @doc """
  Generate a token for an election given an email address.
  Validates email format and handles magic strings for testing.
  """
  def generate_token(election_identifier, email) when is_binary(election_identifier) and is_binary(email) do
    # Validate email format
    case validate_email(email) do
      {:error, reason} ->
        {:error, reason}

      :ok ->
        # Check magic strings for testing
        case check_magic_strings(email) do
          {:error, reason} ->
            {:error, reason}

          :ok ->
            # Get election and generate token
            case ElectionsContext.get_election(election_identifier) do
              {:ok, election} ->
                generate_token_for_election(election, election_identifier, email)

              error ->
                error
            end
        end
    end
  end

  @doc """
  Generate a test token (for development/debugging).
  """
  def generate_test_token(election_identifier) do
    generate_token(election_identifier, "test@example.com")
  end

  defp generate_token_for_election(election, election_identifier, _email) do
    RepoManager.with_repo(election_identifier, fn repo ->
      token = generate_uuid()
      view_token = generate_uuid()

      changeset =
        VoteToken.changeset(%VoteToken{}, %{
          token: token,
          election_id: election.id,
          view_token: view_token,
          used: false
        })

      case repo.insert(changeset) do
        {:ok, vote_token} ->
          {:ok, %{token: token, view_token: view_token, vote_token_id: vote_token.id}}

        error ->
          error
      end
    end)
  end

  defp validate_email(email) do
    # Basic email validation (RFC 5322 simplified)
    email_pattern = ~r/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    
    if String.match?(email, email_pattern) do
      :ok
    else
      {:error, :invalid_email_format}
    end
  end

  defp check_magic_strings(email) do
    email_lower = String.downcase(email)
    
    cond do
      email_lower == "not registered" ->
        {:error, :not_registered}
      
      email_lower == "voted already" ->
        {:error, :already_voted}
      
      true ->
        :ok
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

