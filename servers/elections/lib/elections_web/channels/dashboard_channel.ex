defmodule ElectionsWeb.DashboardChannel do
  use Phoenix.Channel

  def join("dashboard:" <> election_id, _params, socket) do
    # Subscribe to election updates
    Phoenix.PubSub.subscribe(Elections.PubSub, "dashboard:#{election_id}")
    {:ok, socket}
  end

  def handle_info({:vote_submitted, election_id, vote_data}, socket) do
    push(socket, "vote_submitted", %{election_id: election_id, vote_data: vote_data})
    {:noreply, socket}
  end

  def handle_info({:results_updated, election_id, results}, socket) do
    push(socket, "results_updated", %{election_id: election_id, results: results})
    {:noreply, socket}
  end
end

