# Elections Server

Phoenix-based server for managing elections and vote counting.

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
         - name: "Bob Smith"
           affiliation: "Republican Party"
   ```

4. Start the server:
   ```bash
   mix phx.server
   ```

## API Endpoints

### Vote Submission
```
POST /api/votes
Body: {
  "election_id": "...",
  "token": "...",
  "ballot": {
    "5": ["Candidate A", "Candidate B"],
    "4": ["Candidate C"],
    "0": ["Candidate D"],
    "unranked": ["Candidate E"]
  }
}
```

### View Vote
```
GET /api/votes/:election_id?token=...&view_token=...
```

### Dashboard
```
GET /api/dashboard                    # List available elections
GET /api/dashboard/:id                # Get election results
GET /api/dashboard/:id/tally           # Get raw vote tally
GET /api/dashboard/:id/visualize/:method  # Get visualization data
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

## Next Steps

- Complete algorithm implementations (currently placeholders)
- Add visualization data generation (Sankey charts, etc.)
- Add email token distribution
- Add election result export
- Add comprehensive tests
