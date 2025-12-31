defmodule Elections.Repo do
  use Ecto.Repo,
    otp_app: :elections,
    adapter: Ecto.Adapters.Postgres
end

