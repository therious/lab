defmodule Elections.Repo.Migrations.CreateVotes do
  use Ecto.Migration

  def change do
    create table(:votes, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :election_id, references(:elections, type: :binary_id, on_delete: :delete_all), null: false
      add :vote_token_id, references(:vote_tokens, type: :binary_id, on_delete: :delete_all), null: false
      add :ballot_data, :jsonb, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:votes, [:vote_token_id])
    create index(:votes, [:election_id])
  end
end
