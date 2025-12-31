defmodule Elections.Repo.Migrations.CreateElections do
  use Ecto.Migration

  def change do
    create table(:elections, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :identifier, :string, null: false
      add :config, :text, null: false  # SQLite uses text for JSON - stores full election config including ballots
      add :voting_start, :utc_datetime, null: false
      add :voting_end, :utc_datetime, null: false
      add :service_start, :utc_datetime, null: false
      add :service_end, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:elections, [:identifier])
  end
end
