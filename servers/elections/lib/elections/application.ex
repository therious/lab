defmodule Elections.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @create_test_data Application.compile_env(:elections, :create_test_data, false)

  @impl true
  def start(_type, _args) do
    # Initialize repo cache before starting supervisors
    Elections.RepoManager.init_cache()

    children = [
      ElectionsWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:elections, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Elections.PubSub},
      # Elections.Repo must be started for put_dynamic_repo to work
      # It uses a default database config, but individual election repos are created dynamically
      Elections.Repo,
      # Start a worker by calling: Elections.Worker.start_link(arg)
      # {Elections.Worker, arg},
      # Start to serve requests, typically the last entry
      ElectionsWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Elections.Supervisor]
    result = Supervisor.start_link(children, opts)

    # Load election configs (this will create repos dynamically as needed)
    Elections.ConfigLoader.load_elections_from_yaml()

    # Create test data for closed elections (in dev/test mode)
    if @create_test_data do
      Elections.TestData.create_walnut_hills_votes()
    end

    result
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    ElectionsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
