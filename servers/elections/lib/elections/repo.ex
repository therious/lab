defmodule Elections.Repo do
  use Ecto.Repo,
    otp_app: :elections,
    adapter: Ecto.Adapters.SQLite3
end

