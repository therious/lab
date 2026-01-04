defmodule ElectionsWeb.Router do
  use ElectionsWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {ElectionsWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json", "html"]
  end

  # API routes must come before catch-all to avoid being matched by it
  scope "/api", ElectionsWeb do
    pipe_through :api

    # Election management
    get "/elections", ElectionController, :index
    get "/elections/:identifier", ElectionController, :show

    # Token generation and validation
    post "/tokens", TokenController, :create
    post "/tokens/check", TokenController, :check_status
    get "/debug/token", TokenController, :debug_get_token

    # Vote submission and viewing
    post "/votes", VoteController, :submit
    get "/votes/:election_identifier", VoteController, :view

    # Dashboard
    get "/dashboard", DashboardController, :index
    get "/dashboard/:identifier", DashboardController, :show
    get "/dashboard/:identifier/tally", DashboardController, :tally
    get "/dashboard/:identifier/visualize/:method", DashboardController, :visualize
  end

  scope "/", ElectionsWeb do
    pipe_through :browser

    # Serve the React app for all non-API routes
    get "/*path", PageController, :home
  end
end

    # Build info endpoint (available before login)
    get "/build-info", BuildInfoController, :show
