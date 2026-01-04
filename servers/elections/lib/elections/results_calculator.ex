defmodule Elections.ResultsCalculator do
  @moduledoc """
  GenServer that queues and processes election results calculations.
  
  - Queues calculation requests per election
  - Processes calculations sequentially (one at a time per election)
  - Skips intermediate calculations if new votes arrive
  - Processes ballots in parallel since they're independent
  """
  
  use GenServer
  require Logger
  
  import Ecto.Query
  alias Elections.{Election, Vote}
  alias Elections.RepoManager
  alias Elections.Voting
  
  @debug_logging Application.compile_env(:elections, :debug_logging, false)
  
  defp debug_log(level, message) do
    if @debug_logging do
      Logger.log(level, message)
    end
  end
  
  # Client API
  
  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end
  
  @doc """
  Request results calculation for an election.
  If a calculation is already in progress, it will be skipped and a new one queued.
  """
  def calculate_results(election_identifier) when is_binary(election_identifier) do
    GenServer.cast(__MODULE__, {:calculate, election_identifier})
  end
  
  # Server callbacks
  
  @impl true
  def init(_opts) do
    # State: %{election_identifier => :calculating | :queued}
    {:ok, %{}}
  end
  
  @impl true
  def handle_cast({:calculate, election_identifier}, state) do
    case Map.get(state, election_identifier) do
      :calculating ->
        # Calculation in progress - mark as queued for recalculation after current one finishes
        debug_log(:info, "[ResultsCalculator] Calculation in progress for #{election_identifier}, queuing recalculation")
        {:noreply, Map.put(state, election_identifier, :queued)}
      
      :queued ->
        # Already queued - no need to queue again
        debug_log(:info, "[ResultsCalculator] Already queued for #{election_identifier}")
        {:noreply, state}
      
      nil ->
        # No calculation in progress - start immediately
        debug_log(:info, "[ResultsCalculator] Starting calculation for #{election_identifier}")
        server_pid = self()
        Task.start(fn -> process_calculation(election_identifier, server_pid) end)
        {:noreply, Map.put(state, election_identifier, :calculating)}
    end
  end
  
  @impl true
  def handle_info({:calculation_complete, election_identifier}, state) do
    case Map.get(state, election_identifier) do
      :queued ->
        # New votes arrived during calculation - recalculate immediately
        debug_log(:info, "[ResultsCalculator] Recalculating #{election_identifier} (new votes during calculation)")
        server_pid = self()
        Task.start(fn -> process_calculation(election_identifier, server_pid) end)
        {:noreply, Map.put(state, election_identifier, :calculating)}
      
      :calculating ->
        # Calculation finished, no new votes - mark as idle
        debug_log(:info, "[ResultsCalculator] Calculation complete for #{election_identifier}")
        {:noreply, Map.delete(state, election_identifier)}
      
      _ ->
        {:noreply, state}
    end
  end
  
  # Private functions
  
  defp process_calculation(election_identifier, server_pid) do
    RepoManager.with_repo(election_identifier, fn repo ->
      case repo.get_by(Election, identifier: election_identifier) do
        nil ->
          debug_log(:error, "[ResultsCalculator] Election not found: #{election_identifier}")
          send(server_pid, {:calculation_complete, election_identifier})
        
        election ->
          vote_count = repo.aggregate(
            from(v in Vote, where: v.election_id == ^election.id),
            :count
          )
          
          if vote_count == 0 do
            debug_log(:warning, "[ResultsCalculator] Vote count is 0 for #{election_identifier} - skipping broadcast")
            send(server_pid, {:calculation_complete, election_identifier})
          else
            debug_log(:info, "[ResultsCalculator] Calculating results for #{election_identifier}, vote_count=#{vote_count}")
            
            results = Voting.calculate_all_results(repo, election)
            results_vote_count = results.metadata.total_votes
            
            if results_vote_count == 0 do
              debug_log(:warning, "[ResultsCalculator] Results show 0 votes but vote_count was #{vote_count} - skipping broadcast")
            else
              Phoenix.PubSub.broadcast(
                Elections.PubSub,
                "dashboard:#{election_identifier}",
                {:results_updated, election_identifier, results}
              )
              debug_log(:info, "[ResultsCalculator] Broadcast results for #{election_identifier}, total_votes=#{results_vote_count}")
            end
            
            send(server_pid, {:calculation_complete, election_identifier})
          end
      end
    end)
  end
end

