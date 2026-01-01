# Database Inspection Guide

This guide explains how to inspect SQLite databases for each election.

## Database Location

Each election has its own SQLite database file:
```
servers/elections/priv/repo/{election-identifier}.db
```

For example:
- `servers/elections/priv/repo/2026-general-election.db`
- `servers/elections/priv/repo/walnut-hills-high-school-2025.db`
- `servers/elections/priv/repo/congregation-anshei-kartoffel-2026.db`

## Finding Election Databases

### List All Election Databases

**Command line:**
```bash
cd servers/elections
ls -lh priv/repo/*.db
```

**From Elixir console:**
```bash
cd servers/elections
iex -S mix
iex> Elections.RepoManager.list_elections()
```

**API endpoint:**
```bash
curl http://localhost:4000/api/elections
# or
curl http://localhost:4000/api/dashboard
```

## DataGrip Connection

### Connect to a Specific Election Database

1. Open DataGrip
2. Click `+` → `Data Source` → `SQLite`
3. **File**: Browse to `servers/elections/priv/repo/{election-identifier}.db`
4. Click **Test Connection** → **OK**

### JDBC URL Format

```
jdbc:sqlite:/absolute/path/to/servers/elections/priv/repo/{election-identifier}.db
```

Example:
```
jdbc:sqlite:/Users/hzamir/work/lab-b/servers/elections/priv/repo/2026-general-election.db
```

## Database Schema

Each election database contains:

### Tables

- **elections**: Election configuration
  - `id` (BLOB, PRIMARY KEY)
  - `identifier` (TEXT, UNIQUE)
  - `config` (TEXT, JSON) - Contains ballots, title, description
  - `voting_start` (TEXT, DATETIME)
  - `voting_end` (TEXT, DATETIME)
  - `service_start` (TEXT, DATETIME)
  - `service_end` (TEXT, DATETIME, NULLABLE)
  - `inserted_at` (TEXT, DATETIME)
  - `updated_at` (TEXT, DATETIME)

- **vote_tokens**: Voting tokens
  - `id` (BLOB, PRIMARY KEY)
  - `token` (TEXT, UNIQUE)
  - `election_id` (BLOB, FOREIGN KEY → elections.id)
  - `view_token` (TEXT, UNIQUE)
  - `used` (INTEGER, BOOLEAN)
  - `used_at` (TEXT, DATETIME, NULLABLE)
  - `preview` (INTEGER, BOOLEAN) - True for preview tokens
  - `inserted_at` (TEXT, DATETIME)
  - `updated_at` (TEXT, DATETIME)

- **votes**: Submitted votes
  - `id` (BLOB, PRIMARY KEY)
  - `election_id` (BLOB, FOREIGN KEY → elections.id)
  - `vote_token_id` (BLOB, FOREIGN KEY → vote_tokens.id, UNIQUE)
  - `ballot_data` (TEXT, JSON) - Contains vote data for all ballots
  - `inserted_at` (TEXT, DATETIME)
  - `updated_at` (TEXT, DATETIME)

- **schema_migrations**: Ecto migration tracking
  - `version` (BIGINT, PRIMARY KEY)
  - `inserted_at` (TEXT, DATETIME)

## Useful SQL Queries

### View Election Configuration
```sql
SELECT 
  identifier,
  json_extract(config, '$.title') as title,
  json_extract(config, '$.description') as description,
  voting_start,
  voting_end,
  service_start,
  service_end
FROM elections;
```

### View All Ballots in Election
```sql
SELECT 
  json_extract(config, '$.ballots') as ballots
FROM elections;
```

### Count Votes per Election
```sql
SELECT 
  e.identifier,
  json_extract(e.config, '$.title') as title,
  COUNT(v.id) as vote_count
FROM elections e
LEFT JOIN votes v ON e.id = v.election_id
GROUP BY e.id;
```

### View All Votes
```sql
SELECT 
  v.id,
  v.ballot_data,
  vt.token,
  v.inserted_at
FROM votes v
JOIN vote_tokens vt ON v.vote_token_id = vt.id
ORDER BY v.inserted_at DESC;
```

### View Votes for a Specific Ballot
```sql
SELECT 
  v.id,
  json_extract(v.ballot_data, '$.{ballot_title}') as ballot_vote,
  v.inserted_at
FROM votes v
WHERE json_extract(v.ballot_data, '$.{ballot_title}') IS NOT NULL;
```

### View Unused Tokens
```sql
SELECT 
  token, 
  view_token, 
  election_id, 
  preview,
  inserted_at
FROM vote_tokens
WHERE used = 0;
```

### View Used Tokens
```sql
SELECT 
  token, 
  view_token, 
  election_id,
  used_at,
  inserted_at
FROM vote_tokens
WHERE used = 1
ORDER BY used_at DESC;
```

### View Vote Timeline
```sql
SELECT 
  DATE(inserted_at) as date,
  COUNT(*) as vote_count
FROM votes
GROUP BY DATE(inserted_at)
ORDER BY date;
```

## Command Line Inspection

### Using sqlite3 CLI

**Connect to a specific election database:**
```bash
cd servers/elections
sqlite3 priv/repo/2026-general-election.db
```

**Quick queries:**
```bash
# Count votes
sqlite3 priv/repo/2026-general-election.db "SELECT COUNT(*) FROM votes;"

# View election title
sqlite3 priv/repo/2026-general-election.db "SELECT json_extract(config, '$.title') FROM elections;"

# Export all votes to JSON
sqlite3 priv/repo/2026-general-election.db -json "SELECT * FROM votes;" > votes.json
```

## Web-Based Database Browser

### Option 1: SQLite Browser Extension
Install a browser extension like "SQLite Viewer" and open database files directly.

### Option 2: Online SQLite Viewer
Upload database files to online viewers (use with caution for sensitive data):
- https://sqliteviewer.app/
- https://inloop.github.io/sqlite-viewer/

## API Endpoints for Database Info

### List All Elections
```bash
GET http://localhost:4000/api/elections
GET http://localhost:4000/api/dashboard
```

### Get Election Details
```bash
GET http://localhost:4000/api/elections/{identifier}
```

### Get Vote Tally
```bash
GET http://localhost:4000/api/dashboard/{identifier}/tally
```

### Get Results
```bash
GET http://localhost:4000/api/dashboard/{identifier}
```

