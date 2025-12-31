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
    plug :accepts, ["json"]
  end

  scope "/", ElectionsWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  # Other scopes may use custom stacks.
  scope "/api", ElectionsWeb do
    pipe_through :api

    # Token generation (dev/testing only)
    post "/tokens", TokenController, :create

    # Vote submission and viewing
    post "/votes", VoteController, :submit
    get "/votes/:election_id", VoteController, :view

    # Dashboard
    get "/dashboard", DashboardController, :index
    get "/dashboard/:id", DashboardController, :show
    get "/dashboard/:id/tally", DashboardController, :tally
    get "/dashboard/:id/visualize/:method", DashboardController, :visualize
  end
end
