defmodule ElectionsWeb.PageController do
  use ElectionsWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
