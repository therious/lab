# Testing the Elections Server

## Setup

1. **Start the server:**
   ```bash
   # Option 1: Build UI and start server (recommended)
   cd ../../apps/elect
   pnpm serve
   
   # Option 2: Start server only
   cd servers/elections
   mix phx.server
   ```

2. The server will load elections from `priv/elections/*.yaml` on startup.

3. **Access the UI:** Open http://localhost:4000 in your browser

For more details, see the [main README](./README.md) and [Elect webapp README](../../apps/elect/README.md).

## Generate Test Tokens

```bash
# Generate a token for presidential election
curl -X POST http://localhost:4000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{"election_identifier": "presidential-2025"}'
```

Response:
```json
{
  "status": "success",
  "tokens": {
    "token": "abc-123-def-456",
    "view_token": "xyz-789-uvw-012",
    "vote_token_id": "..."
  }
}
```

## Submit a Vote

```bash
# Get election ID first
curl http://localhost:4000/api/dashboard

# Submit a vote
curl -X POST http://localhost:4000/api/votes \
  -H "Content-Type: application/json" \
  -d '{
    "election_id": "<election_id_from_dashboard>",
    "token": "<token_from_above>",
    "ballot": {
      "5": ["Alice Johnson"],
      "4": ["Bob Smith"],
      "3": ["Catherine Lee"],
      "0": ["David Brown"],
      "unranked": []
    }
  }'
```

Response:
```json
{
  "status": "success",
  "view_token": "xyz-789-uvw-012"
}
```

## View Dashboard

```bash
# List all elections
curl http://localhost:4000/api/dashboard

# Get results for specific election
curl http://localhost:4000/api/dashboard/<election_id>

# Get raw tally
curl http://localhost:4000/api/dashboard/<election_id>/tally

# Get visualization for a method
curl http://localhost:4000/api/dashboard/<election_id>/visualize/score
curl http://localhost:4000/api/dashboard/<election_id>/visualize/ranked_pairs
curl http://localhost:4000/api/dashboard/<election_id>/visualize/shulze
curl http://localhost:4000/api/dashboard/<election_id>/visualize/irv
curl http://localhost:4000/api/dashboard/<election_id>/visualize/coombs
```

## View Your Vote

```bash
curl "http://localhost:4000/api/votes/<election_id>?token=<token>&view_token=<view_token>"
```

## WebSocket Connection

Connect to `ws://localhost:4000/socket` and join channel `dashboard:<election_id>` to receive real-time updates when votes are submitted.

## Debug Token Endpoint (for UI Testing)

The debug endpoint allows the UI to request tokens repeatedly for testing:

```bash
# By election identifier
curl "http://localhost:4000/api/debug/token?election_identifier=presidential-2025"

# By election title
curl "http://localhost:4000/api/debug/token?election_title=Presidential Election"
```

Response includes `election_id`, `election_identifier`, and `tokens` (token + view_token).

## Database Inspection

To inspect submitted votes and tokens, see [SQLITE_CONNECTION.md](./SQLITE_CONNECTION.md).

## Related Documentation

- [Main README](./README.md) - Server overview and setup
- [Elect Webapp README](../../apps/elect/README.md) - UI testing and usage
- [SQLITE_CONNECTION.md](./SQLITE_CONNECTION.md) - Database queries

