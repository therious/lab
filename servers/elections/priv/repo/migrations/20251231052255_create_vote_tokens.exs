defmodule Elections.Repo.Migrations.CreateVoteTokens do
  use Ecto.Migration

  def change do
    create table(:vote_tokens, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :token, :string, null: false
      add :election_id, references(:elections, type: :binary_id, on_delete: :delete_all), null: false
      add :used, :boolean, null: false, default: false
      add :used_at, :utc_datetime
      add :view_token, :string, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:vote_tokens, [:token])
    create unique_index(:vote_tokens, [:view_token])
    create index(:vote_tokens, [:election_id])
    create index(:vote_tokens, [:used])
  end
end
