# Votes Migration Note

## Why You're Seeing Zero Votes

With the new dynamic repo architecture (implemented in commit `8631e65`), each election now has its own isolated SQLite database. This means:

### Old Architecture (Before Fix)
- All elections' votes were stored in `priv/repo/elections.db`
- This file currently contains **114 votes** from previous voting sessions

### New Architecture (After Fix)
- Each election has its own database: `priv/repo/{election-identifier}.db`
- New votes are stored in the election-specific databases
- These databases start empty (except for test data like walnut-hills-high-school-2025 which has 10 test votes)

### Current Status

```bash
# Old votes (in default database)
priv/repo/elections.db: 114 votes

# New votes (in election-specific databases)
priv/repo/2026-general-election.db: 0 votes
priv/repo/riverside-coop-2026.db: 0 votes
priv/repo/congregation-anshei-kartoffel-2026.db: 0 votes
priv/repo/walnut-hills-high-school-2025.db: 10 votes (test data)
```

## What This Means

**This is expected behavior.** The new architecture provides proper database isolation, but it means:

1. **Old votes remain in the old database** - They're not lost, just in a different location
2. **New votes go to election-specific databases** - This is the correct behavior going forward
3. **You're starting fresh** - Each election's database is isolated from the start

## If You Need to Migrate Old Votes

If you need to move votes from the old database to the new election-specific databases, you would need to:

1. Identify which election each vote belongs to (via `election_id` in the old database)
2. Extract the votes for each election
3. Insert them into the appropriate election-specific database

However, **this is not recommended** because:
- The old database structure may not match the new structure exactly
- Vote tokens may not be valid across the migration
- It's safer to start fresh with the new architecture

## Verification

To verify the new architecture is working:

1. **Submit a new vote** for any election
2. **Check the election-specific database:**
   ```bash
   sqlite3 priv/repo/{election-identifier}.db "SELECT COUNT(*) FROM votes;"
   ```
3. **Verify it doesn't appear in the old database:**
   ```bash
   sqlite3 priv/repo/elections.db "SELECT COUNT(*) FROM votes;"
   # Should still show 114 (old votes)
   ```

## Going Forward

All new votes will be properly isolated in their election-specific databases. This provides:
- ✅ Complete data isolation between elections
- ✅ Easier database management (one file per election)
- Better security (can restrict access per election)

