defmodule Elections.Vote do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "votes" do
    field :ballot_data, :map

    belongs_to :election, Elections.Election
    belongs_to :vote_token, Elections.VoteToken

    timestamps(type: :utc_datetime)
  end

  def changeset(vote, attrs) do
    vote
    |> cast(attrs, [:election_id, :vote_token_id, :ballot_data])
    |> validate_required([:election_id, :vote_token_id])
    |> validate_ballot_data_present()
    |> validate_ballot_data_structure()
    |> unique_constraint(:vote_token_id)
  end

  # Ensure ballot_data is present (but allow empty maps for empty ballots)
  defp validate_ballot_data_present(changeset) do
    case get_change(changeset, :ballot_data) do
      nil ->
        add_error(changeset, :ballot_data, "is required")
      
      _ ->
        changeset
    end
  end

  # Validate that ballot_data is a map (empty ballots are allowed)
  defp validate_ballot_data_structure(changeset) do
    case get_change(changeset, :ballot_data) do
      nil ->
        changeset
      
      ballot_data when is_map(ballot_data) ->
        # Empty ballots are valid - voter may choose not to rank any candidates
        # Empty map %{} is acceptable, as is a map with all empty arrays
        changeset
      
      _ ->
        add_error(changeset, :ballot_data, "must be a valid ballot structure")
    end
  end
end

