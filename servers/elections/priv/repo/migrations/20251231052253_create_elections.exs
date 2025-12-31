defmodule Elections.Repo.Migrations.CreateElections do
  use Ecto.Migration

  def change do
    create table(:elections, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :identifier, :string, null: false
      add :config, :jsonb, null: false
      add :number_of_winners, :integer, null: false, default: 1
      add :voting_start, :utc_datetime, null: false
      add :voting_end, :utc_datetime, null: false
      add :service_start, :utc_datetime, null: false
      add :service_end, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create unique_index(:elections, [:identifier])
  end
end
