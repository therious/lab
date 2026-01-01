# Elixir Server Monitoring Guide

This guide explains how to monitor the Elections server process with UI-based visibility.

## Phoenix LiveDashboard (Recommended)

Phoenix LiveDashboard provides a real-time web-based monitoring interface.

### Setup

1. **Add dependency** (if not already present):
```elixir
# mix.exs
{:phoenix_live_dashboard, "~> 0.8"}
```

2. **Add route** in `lib/elections_web/router.ex`:
```elixir
if Mix.env() == :dev do
  scope "/" do
    pipe_through :browser
    live_dashboard "/dashboard", metrics: ElectionsWeb.Telemetry.metrics()
  end
end
```

3. **Access dashboard:**
```
http://localhost:4000/dashboard
```

### Features

- **Metrics**: Request counts, response times, memory usage
- **Request Logger**: View all HTTP requests in real-time
- **Processes**: Monitor running processes
- **Ports**: View open ports
- **ETS**: Inspect ETS tables
- **System Info**: CPU, memory, scheduler info

## Observer (Built-in Erlang Tool)

Observer provides a comprehensive GUI for monitoring Erlang/Elixir systems.

### Setup

1. **Start with observer:**
```bash
cd servers/elections
iex -S mix
iex> :observer.start()
```

2. **Or start server with observer:**
```bash
ELIXIR_ERL_OPTIONS="-observer" mix phx.server
```

### Features

- **System**: Overview of system resources
- **Applications**: Running applications and supervision trees
- **Processes**: All running processes with details
- **Ets**: ETS table inspection
- **Mnesia**: Database tables (if using Mnesia)
- **Trace**: Process tracing
- **Table Viewer**: Inspect any table

## Command Line Monitoring

### Check Server Status

```bash
# Check if server is running
lsof -i :4000

# View process info
ps aux | grep beam

# Check memory usage
ps aux | grep beam | awk '{print $6/1024 " MB"}'
```

### View Logs

```bash
# If using log file
tail -f /tmp/elections-server.log

# Or view Phoenix logs directly
cd servers/elections
tail -f log/dev.log
```

### Check Database Connections

```bash
cd servers/elections
iex -S mix
iex> Elections.RepoManager.list_elections()
iex> Elections.Repo.checkout(fn -> Elections.Repo.query("SELECT COUNT(*) FROM votes") end)
```

## Process Monitoring via IEx

```bash
cd servers/elections
iex -S mix
```

### Useful IEx Commands

```elixir
# List all running processes
Process.list() |> length()

# Get process info
Process.info(self())

# Check memory
:erlang.memory()

# View supervision tree
:observer_cli.start()

# Check application status
Application.started_applications()

# View election databases
Elections.RepoManager.list_elections()

# Check vote counts
Elections.RepoManager.with_repo("2026-general-election", fn repo ->
  import Ecto.Query
  repo.aggregate(from(v in Elections.Vote), :count)
end)
```

## Telemetry Metrics

The server already has telemetry configured. View metrics:

### Via LiveDashboard
Access `/dashboard` to see real-time metrics.

### Via Console
```elixir
# In IEx
:telemetry.list_handlers()
```

## Health Check Endpoint

Create a health check endpoint:

```elixir
# lib/elections_web/controllers/health_controller.ex
defmodule ElectionsWeb.HealthController do
  use ElectionsWeb, :controller

  def check(conn, _params) do
    conn
    |> json(%{
      status: "ok",
      timestamp: DateTime.utc_now(),
      elections: Elections.RepoManager.list_elections() |> length(),
      memory: :erlang.memory()[:total]
    })
  end
end
```

Add route:
```elixir
get "/health", HealthController, :check
```

Access:
```
GET http://localhost:4000/health
```

## Monitoring Tools

### Option 1: Phoenix LiveDashboard (Best for Web UI)
- Real-time web interface
- No additional setup needed
- Accessible from browser
- Shows metrics, processes, requests

### Option 2: Observer (Best for Deep Inspection)
- Full GUI application
- Detailed process inspection
- System-wide monitoring
- Requires desktop access

### Option 3: Prometheus + Grafana (Best for Production)
- Time-series metrics
- Alerting
- Historical data
- Requires additional setup

## Quick Status Check

```bash
# One-liner to check server status
curl -s http://localhost:4000/api/dashboard | jq '.elections | length'
```

## Process Management

### View Running Processes
```bash
# Find Elixir processes
ps aux | grep elixir

# Find by port
lsof -i :4000
```

### Monitor Resource Usage
```bash
# CPU and memory
top -p $(pgrep -f "beam.*elections")

# Or use htop for better UI
htop -p $(pgrep -f "beam.*elections")
```

## Log Monitoring

### Real-time Logs
```bash
# If using systemd
journalctl -u elections -f

# If using log file
tail -f /tmp/elections-server.log

# Phoenix logs
cd servers/elections
tail -f log/dev.log
```

### Search Logs
```bash
# Find errors
grep -i error log/dev.log

# Find vote submissions
grep "vote submitted" log/dev.log

# Find calculation errors
grep "Error calculating" log/dev.log
```

