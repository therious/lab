# Elections Server

Phoenix-based server for managing elections and vote counting. Serves the [Elect webapp](../../apps/elect/README.md) and provides REST API and WebSocket endpoints for voting operations.

## Quick Start

### Development (Local)

1. **Build UI and start server:**
   ```bash
   cd ../../apps/elect
   pnpm serve
   ```
   This will:
   - Build the React UI
   - Copy assets to the server
   - Start the Phoenix server
   - Display the server URL

   **Alternative:** Start server only (without UI build):
   ```bash
   cd servers/elections
   mix phx.server
   ```

2. **Stop the server:**
   ```bash
   # From anywhere in workspace (recommended)
   ./scripts/stop-elections.sh
   
   # Or from server directory
   cd servers/elections
   ./scripts/stop-server.sh
   ```

### Docker

1. **Build and run with Docker Compose:**
   ```bash
   cd docker
   docker-compose -f elections-compose.yml up --build
   ```

2. **Or from server directory:**
   ```bash
   cd servers/elections
   docker-compose up --build
   ```

3. **Stop Docker containers:**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Debug Token (for UI testing)
```
GET /api/debug/token?election_identifier=presidential-2025
GET /api/debug/token?election_title=Presidential Election
```

### Vote Submission
```
POST /api/votes
Body: {
  "election_id": "...",
  "token": "...",
  "ballot": {
    "5": ["Candidate A"],
    "4": ["Candidate B"],
    "0": ["Candidate C"],
    "unranked": []
  }
}
```

### Dashboard
```
GET /api/dashboard                    # List available elections
GET /api/dashboard/:id                # Get election results
GET /api/dashboard/:id/tally          # Get raw vote tally
GET /api/dashboard/:id/visualize/:method  # Get visualization data
```

## SQLite Database

See [docs/DATABASE_INSPECTION.md](./docs/DATABASE_INSPECTION.md) for database inspection details and [docs/SQLITE_CONNECTION.md](./docs/SQLITE_CONNECTION.md) for DataGrip connection details.

**Database Location:** Each election has its own database at `priv/repo/{election-identifier}.db`

**Inspect Database:**
- **DataGrip**: See [docs/SQLITE_CONNECTION.md](./docs/SQLITE_CONNECTION.md)
- **Command Line**: `sqlite3 priv/repo/{election-identifier}.db`
- **Inspection Guide**: See [docs/DATABASE_INSPECTION.md](./docs/DATABASE_INSPECTION.md)

## Features

- **Election Management**: Load elections from YAML configuration files
- **Vote Submission**: Submit votes using one-time tokens
- **Token Management**: Dev mode allows multiple votes for testing
- **Vote Viewing**: View submitted votes using token + view_token
- **Real-time Updates**: WebSocket support for live dashboard updates
- **Multiple Voting Methods**: Support for 5 different voting algorithms:
  - Ranked Pairs (Tideman)
  - Shulze Method
  - Score Voting (0-5 scale)
  - IRV/STV (Instant Runoff / Single Transferable Vote)
  - Coombs Method

## Setup

1. Install dependencies:
   ```bash
   mix deps.get
   ```

2. Set up the database:
   ```bash
   mix ecto.create
   mix ecto.migrate
   ```

3. Create election config files in `priv/elections/`:
   ```yaml
   elections:
     - identifier: "presidential-2025"
       title: "Presidential Election"
       number_of_winners: 1
       voting_start: "2025-01-01T00:00:00Z"
       voting_end: "2025-01-31T23:59:59Z"
       service_start: "2025-02-01T00:00:00Z"
       candidates:
         - name: "Alice Johnson"
           affiliation: "Democratic Party"
   ```

4. Start the server:
   ```bash
   mix phx.server
   ```

## WebSocket

Connect to `/socket` and join channel `dashboard:<election_id>` for real-time updates.

## Development Mode

In development mode (`dev_mode: true` in `config/dev.exs`), tokens can be reused multiple times for testing purposes.

## Database Schema

- **elections**: Election configurations and metadata
- **vote_tokens**: One-time voting tokens with view tokens
- **votes**: Submitted ballots with JSONB ballot_data

## Voting Algorithms

All algorithms are implemented in `lib/elections/algorithms/`. Each algorithm:
- Accepts election config and votes
- Returns winners array and status (conclusive/inconclusive)
- Supports multi-winner elections via `number_of_winners` field

## Server Management

### Starting the Server

**Option 1: Build UI and start (recommended)**
```bash
# From workspace root
./scripts/start-elections.sh

# Or from apps/elect
cd apps/elect
pnpm serve
```

**Option 2: Server only**
```bash
cd servers/elections
mix phx.server
```

### Stopping the Server

**From anywhere in workspace:**
```bash
./scripts/stop-elections.sh
```

**From server directory:**
```bash
cd servers/elections
./scripts/stop-server.sh
```

**Manual stop:**
```bash
# Kill by PID file
kill $(cat /tmp/elections-server.pid)

# Kill by port
kill $(lsof -ti:4000)

# Force kill
kill -9 $(lsof -ti:4000)
```

### Checking Server Status

```bash
# Check if running
lsof -i :4000

# View logs
tail -f /tmp/elections-server.log

# Check PID file
cat /tmp/elections-server.pid
```

## URLs

- **UI:** http://localhost:4000 (serves [Elect webapp](../../apps/elect/README.md))
- **API:** http://localhost:4000/api
- **Dashboard:** http://localhost:4000/api/dashboard

## Testing

For detailed API testing examples, see [docs/TESTING.md](./docs/TESTING.md).

### Quick Test

1. **Get a debug token:**
   ```bash
   curl "http://localhost:4000/api/debug/token?election_identifier=presidential-2025"
   ```

2. **Submit a vote:**
   ```bash
   curl -X POST http://localhost:4000/api/votes \
     -H "Content-Type: application/json" \
     -d '{
       "election_id": "<id>",
       "token": "<token>",
       "ballot": {"5": ["Alice Johnson"], "0": ["Bob Smith"], "unranked": []}
     }'
   ```

3. **View dashboard:**
   ```bash
   curl http://localhost:4000/api/dashboard
   ```

## Related Documentation

- [Elect Webapp README](../../apps/elect/README.md) - React voting interface
- [docs/TESTING.md](./docs/TESTING.md) - Detailed API testing guide
- [docs/DATABASE_INSPECTION.md](./docs/DATABASE_INSPECTION.md) - Database inspection guide
- [docs/SQLITE_CONNECTION.md](./docs/SQLITE_CONNECTION.md) - DataGrip connection details
- [docs/MONITORING.md](./docs/MONITORING.md) - Server monitoring guide
