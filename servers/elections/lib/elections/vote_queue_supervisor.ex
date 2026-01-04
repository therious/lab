defmodule Elections.VoteQueueSupervisor do
  @moduledoc """
  Dynamic supervisor for VoteQueue GenServers.
  Each election gets its own VoteQueue process.
  """
  
  use DynamicSupervisor
  
  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end
  
  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end
end

