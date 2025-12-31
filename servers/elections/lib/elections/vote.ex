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
    |> validate_required([:election_id, :vote_token_id, :ballot_data])
    |> unique_constraint(:vote_token_id)
  end
end

