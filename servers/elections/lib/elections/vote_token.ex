defmodule Elections.VoteToken do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "vote_tokens" do
    field :token, :string
    field :used, :boolean, default: false
    field :used_at, :utc_datetime
    field :view_token, :string

    belongs_to :election, Elections.Election
    has_one :vote, Elections.Vote

    timestamps(type: :utc_datetime)
  end

  def changeset(vote_token, attrs) do
    vote_token
    |> cast(attrs, [:token, :election_id, :used, :used_at, :view_token])
    |> validate_required([:token, :election_id, :view_token])
    |> unique_constraint(:token)
    |> unique_constraint(:view_token)
  end
end

