defmodule Elections.VoteQueue do
  @moduledoc """
  GenServer for managing vote submission queue with durable write-ahead logging.
  
  Provides zero vote loss guarantee by:
  1. Writing votes to durable log file before acknowledging client
  2. Batching votes for efficient database commits
  3. Replaying log on startup for crash recovery
  """
  
  use GenServer
  require Logger
  
  alias Elections.RepoManager
  alias Elections.{VoteToken, Vote}
  
  @batch_size 50
  @batch_interval_ms 100
  @log_file_name "votes.log"
  
  defstruct [
    election_identifier: nil,
    queue: [],
    log_path: nil,
    batch_timer: nil,
    last_commit: nil
  ]
  
  # Client API
  
  @doc """
  Start a VoteQueue for an election identifier.
  """
  def start_link(election_identifier) when is_binary(election_identifier) do
    GenServer.start_link(__MODULE__, election_identifier, name: via_tuple(election_identifier))
  end
  
  @doc """
  Get or start a VoteQueue for an election.
  """
  def get_or_start_queue(election_identifier) when is_binary(election_identifier) do
    case GenServer.whereis(via_tuple(election_identifier)) do
      nil ->
        # Start the queue
        case DynamicSupervisor.start_child(
          Elections.VoteQueueSupervisor,
          {__MODULE__, election_identifier}
        ) do
          {:ok, pid} -> pid
          {:error, {:already_started, pid}} -> pid
          error -> raise "Failed to start VoteQueue: #{inspect(error)}"
        end
      
      pid -> pid
    end
  end
  
  @doc """
  Enqueue a vote for submission.
  Returns immediately after writing to durable log.
  """
  def enqueue_vote(election_identifier, token, ballot_data, election_id, vote_token_id) do
    queue_pid = get_or_start_queue(election_identifier)
    
    # Generate unique vote ID
    vote_id = Ecto.UUID.generate()
    timestamp = DateTime.utc_now() |> DateTime.to_iso8601()
    
    vote_entry = %{
      id: vote_id,
      timestamp: timestamp,
      election_identifier: election_identifier,
      election_id: election_id,
      vote_token_id: vote_token_id,
      token: token,
      ballot_data: ballot_data,
      status: "pending"
    }
    
    # Write to durable log file first (with fsync)
    log_path = log_path(election_identifier)
    log_entry = Jason.encode!(vote_entry) <> "\n"
    
    case File.write(log_path, log_entry, [:append, :sync]) do
      :ok ->
        # Enqueue for batch processing
        GenServer.cast(queue_pid, {:enqueue, vote_entry})
        {:ok, vote_id}
      
      {:error, reason} ->
        Logger.error("Failed to write vote to log: #{inspect(reason)}")
        {:error, :log_write_failed}
    end
  end
  
  @doc """
  Get queue status for an election.
  """
  def get_status(election_identifier) do
    case GenServer.whereis(via_tuple(election_identifier)) do
      nil -> {:error, :not_started}
      pid -> GenServer.call(pid, :get_status)
    end
  end
  
  # Server callbacks
  
  @impl true
  def init(election_identifier) do
    log_path = log_path(election_identifier)
    
    # Ensure log directory exists
    log_dir = Path.dirname(log_path)
    File.mkdir_p!(log_dir)
    
    # Recover pending votes from log on startup
    recovered = recover_pending_votes(election_identifier, log_path)
    
    if length(recovered) > 0 do
      Logger.info("[VoteQueue] Recovered #{length(recovered)} pending votes for #{election_identifier}")
    end
    
    state = %__MODULE__{
      election_identifier: election_identifier,
      queue: recovered,
      log_path: log_path,
      last_commit: DateTime.utc_now()
    }
    
    # Schedule first batch commit
    schedule_batch_commit()
    
    {:ok, state}
  end
  
  @impl true
  def handle_cast({:enqueue, vote_entry}, state) do
    new_state = %{state | queue: [vote_entry | state.queue]}
    
    # Commit immediately if batch size reached
    if length(new_state.queue) >= @batch_size do
      {:noreply, commit_batch(new_state)}
    else
      {:noreply, new_state}
    end
  end
  
  @impl true
  def handle_info(:commit_batch, state) do
    new_state = commit_batch(state)
    schedule_batch_commit()
    {:noreply, new_state}
  end
  
  @impl true
  def handle_call(:get_status, _from, state) do
    {:reply, %{
      queue_size: length(state.queue),
      last_commit: state.last_commit
    }, state}
  end
  
  # Private functions
  
  defp via_tuple(election_identifier) do
    {:via, Registry, {Elections.VoteQueueRegistry, election_identifier}}
  end
  
  defp log_path(election_identifier) do
    db_dir = RepoManager.db_path(election_identifier) |> Path.dirname()
    Path.join(db_dir, @log_file_name)
  end
  
  defp recover_pending_votes(_election_identifier, log_path) do
    if File.exists?(log_path) do
      log_path
      |> File.stream!()
      |> Stream.map(&String.trim/1)
      |> Stream.filter(&(&1 != ""))
      |> Stream.map(fn line ->
        case Jason.decode(line) do
          {:ok, entry} -> entry
          {:error, _} -> nil
        end
      end)
      |> Stream.filter(&(&1 != nil))
      |> Stream.filter(fn entry -> entry["status"] == "pending" end)
      |> Enum.to_list()
    else
      []
    end
  end
  
  defp commit_batch(state) do
    if length(state.queue) == 0 do
      state
    else
      # Take up to batch_size votes
      {to_commit, remaining} = Enum.split(state.queue, @batch_size)
      
      # Commit to database
      case commit_votes_to_db(state.election_identifier, to_commit) do
        :ok ->
          # Mark as committed in log
          mark_committed_in_log(state.log_path, to_commit)
          
          %{state |
            queue: remaining,
            last_commit: DateTime.utc_now()
          }
        
        {:error, reason} ->
          Logger.error("[VoteQueue] Failed to commit batch: #{inspect(reason)}")
          # Keep votes in queue for retry
          state
      end
    end
  end
  
  defp commit_votes_to_db(election_identifier, vote_entries) do
    RepoManager.with_repo(election_identifier, fn repo ->
      repo.transaction(fn ->
        Enum.each(vote_entries, fn entry ->
          # Create vote (use entry ID to ensure idempotency)
          changeset = Vote.changeset(%Vote{}, %{
            id: entry["id"],
            election_id: entry["election_id"],
            vote_token_id: entry["vote_token_id"],
            ballot_data: entry["ballot_data"]
          })
          
          case repo.insert(changeset, on_conflict: :nothing) do
            {:ok, vote} ->
              # Mark token as used (unless already used)
              case repo.get(VoteToken, entry["vote_token_id"]) do
                nil ->
                  Logger.warning("[VoteQueue] VoteToken not found: #{entry["vote_token_id"]}")
                  repo.rollback({:error, :token_not_found})
                
                token when not token.used ->
                  token
                  |> VoteToken.changeset(%{used: true, used_at: DateTime.utc_now()})
                  |> repo.update()
                
                _token ->
                  # Token already used, skip update
                  :ok
              end
              
              # Broadcast vote submission
              Phoenix.PubSub.broadcast(
                Elections.PubSub,
                "dashboard:#{election_identifier}",
                {:vote_submitted, election_identifier, %{vote_id: vote.id}}
              )
            
            {:error, _changeset} = error ->
              repo.rollback(error)
          end
        end)
      end)
    end)
    |> case do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end
  
  defp mark_committed_in_log(log_path, vote_entries) do
    # Read entire log file
    if File.exists?(log_path) do
      lines = File.read!(log_path) |> String.split("\n") |> Enum.filter(&(&1 != ""))
      
      # Update status for committed votes
      vote_ids = MapSet.new(Enum.map(vote_entries, & &1["id"]))
      
      updated_lines = Enum.map(lines, fn line ->
        case Jason.decode(line) do
          {:ok, entry} ->
            if MapSet.member?(vote_ids, entry["id"]) do
              entry
              |> Map.put("status", "committed")
              |> Map.put("committed_at", DateTime.utc_now() |> DateTime.to_iso8601())
              |> Jason.encode!()
            else
              line
            end
          
          {:error, _} -> line
        end
      end)
      
      # Write back to log
      File.write!(log_path, Enum.join(updated_lines, "\n") <> "\n", [:sync])
    end
  end
  
  defp schedule_batch_commit do
    Process.send_after(self(), :commit_batch, @batch_interval_ms)
  end
end

