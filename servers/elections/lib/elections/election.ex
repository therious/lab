defmodule Elections.Election do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "elections" do
    field :identifier, :string
    field :config, :map  # Stores full election config including ballots
    field :voting_start, :utc_datetime
    field :voting_end, :utc_datetime
    field :service_start, :utc_datetime
    field :service_end, :utc_datetime

    has_many :vote_tokens, Elections.VoteToken
    has_many :votes, Elections.Vote

    timestamps(type: :utc_datetime)
  end

  def changeset(election, attrs) do
    election
    |> cast(attrs, [:identifier, :config, :voting_start, :voting_end, :service_start, :service_end])
    |> validate_required([:identifier, :config, :voting_start, :voting_end, :service_start])
    |> unique_constraint(:identifier)
  end
end

