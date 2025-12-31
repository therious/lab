defmodule ElectionsWeb.PageController do
  use ElectionsWeb, :controller

  def home(conn, _params) do
    # Serve the React app's index.html
    index_path = Path.join([:code.priv_dir(:elections), "static", "index.html"])
    
    if File.exists?(index_path) do
      conn
      |> put_resp_content_type("text/html")
      |> send_file(200, index_path)
    else
      # Fallback if index.html doesn't exist yet
      render(conn, :home, layout: false)
    end
  end
end
