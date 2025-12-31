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
    # Validate email format first
    case validate_email(email) do
      {:error, reason} ->
        {:error, reason}

      :ok ->
        # Check magic email domains for testing (after format validation passes)
        case check_magic_domains(email) do
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
    now = DateTime.utc_now()
    # Check if voting window is open
    is_preview = election.voting_start > now
    
    RepoManager.with_repo(election_identifier, fn repo ->
      token = generate_uuid()
      view_token = generate_uuid()

      # For preview tokens (elections not yet open), use a special prefix
      preview_token = if is_preview, do: "preview-#{token}", else: token
      preview_view_token = if is_preview, do: "preview-#{view_token}", else: view_token

      changeset =
        VoteToken.changeset(%VoteToken{}, %{
          token: preview_token,
          election_id: election.id,
          view_token: preview_view_token,
          used: false,
          preview: is_preview
        })

      case repo.insert(changeset) do
        {:ok, vote_token} ->
          {:ok, %{
            token: preview_token,
            view_token: preview_view_token,
            vote_token_id: vote_token.id,
            preview: is_preview
          }}

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

  defp check_magic_domains(email) do
    email_lower = String.downcase(email)
    
    cond do
      # Any email @unregistered.com triggers not_registered error
      String.ends_with?(email_lower, "@unregistered.com") ->
        {:error, :not_registered}
      
      # Any email @voted-already.com triggers already_voted error
      String.ends_with?(email_lower, "@voted-already.com") ->
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

