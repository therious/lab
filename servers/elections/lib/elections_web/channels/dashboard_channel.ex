defmodule ElectionsWeb.DashboardChannel do
  use Phoenix.Channel

  def join("dashboard:" <> election_id, _params, socket) do
    # Subscribe to election updates
    Phoenix.PubSub.subscribe(Elections.PubSub, "dashboard:#{election_id}")
    {:ok, socket}
  end

  def handle_info({:vote_submitted, election_identifier, vote_data}, socket) do
    # Send lightweight vote count update
    # vote_data contains: %{vote_id: ..., vote_count: ...}
    push(socket, "vote_submitted", %{
      election_id: election_identifier, 
      vote_data: vote_data,
      vote_count: Map.get(vote_data, :vote_count, nil)
    })
    {:noreply, socket}
  end

  def handle_info({:results_updated, election_identifier, results}, socket) do
    push(socket, "results_updated", %{election_id: election_identifier, results: results})
    {:noreply, socket}
  end
  
  # Catch-all for any other messages (prevents warnings)
  def handle_info(_msg, socket) do
    {:noreply, socket}
  end
end

