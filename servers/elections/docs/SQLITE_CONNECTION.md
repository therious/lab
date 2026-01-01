# SQLite Database Connection for DataGrip

This guide explains how to connect to the Elections Server SQLite database for inspection and debugging.

**Related Documentation:**
- [Elections Server README](../README.md) - Server overview and setup
- [Elect Webapp README](../../../apps/elect/README.md) - UI application
- [TESTING.md](./TESTING.md) - API testing guide
- [DATABASE_INSPECTION.md](./DATABASE_INSPECTION.md) - Comprehensive database inspection guide

## Database Location
```
servers/elections/priv/repo/elections.db
```

## DataGrip Connection Settings

### Method 1: Direct File Connection
1. Open DataGrip
2. Click `+` → `Data Source` → `SQLite`
3. **File**: Browse to `servers/elections/priv/repo/elections.db`
4. Click **Test Connection** → **OK**

### Method 2: JDBC URL
```
jdbc:sqlite:/absolute/path/to/servers/elections/priv/repo/elections.db
```

Or relative to your workspace:
```
jdbc:sqlite:servers/elections/priv/repo/elections.db
```

## Database Schema

### Tables
- **elections**: Election configurations
  - `id` (BLOB, PRIMARY KEY)
  - `identifier` (TEXT, UNIQUE)
  - `config` (TEXT, JSON)
  - `number_of_winners` (INTEGER)
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
  - `used` (INTEGER, BOOLEAN)
  - `used_at` (TEXT, DATETIME, NULLABLE)
  - `view_token` (TEXT, UNIQUE)
  - `inserted_at` (TEXT, DATETIME)
  - `updated_at` (TEXT, DATETIME)

- **votes**: Submitted votes
  - `id` (BLOB, PRIMARY KEY)
  - `election_id` (BLOB, FOREIGN KEY → elections.id)
  - `vote_token_id` (BLOB, FOREIGN KEY → vote_tokens.id, UNIQUE)
  - `ballot_data` (TEXT, JSON)
  - `inserted_at` (TEXT, DATETIME)
  - `updated_at` (TEXT, DATETIME)

## Useful Queries

### View all elections
```sql
SELECT id, identifier, json_extract(config, '$.title') as title, number_of_winners
FROM elections;
```

### View all votes for an election
```sql
SELECT v.id, v.ballot_data, vt.token, v.inserted_at
FROM votes v
JOIN vote_tokens vt ON v.vote_token_id = vt.id
WHERE v.election_id = '<election_id>';
```

### Count votes per election
```sql
SELECT 
  e.identifier,
  json_extract(e.config, '$.title') as title,
  COUNT(v.id) as vote_count
FROM elections e
LEFT JOIN votes v ON e.id = v.election_id
GROUP BY e.id;
```

### View unused tokens
```sql
SELECT token, view_token, election_id, inserted_at
FROM vote_tokens
WHERE used = 0;
```

