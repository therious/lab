defmodule Elections.Repo.Migrations.AddPreviewToVoteTokens do
  use Ecto.Migration

  def change do
    alter table(:vote_tokens) do
      add :preview, :boolean, null: false, default: false
    end

    create index(:vote_tokens, [:preview])
  end
end
