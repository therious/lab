# Debugging Missing Results - Summary

## What I've Done

1. **Fixed potential double `with_repo` call**: `get_election_results` was calling `ElectionsContext.get_election` which also calls `with_repo`, potentially causing database context issues. Now it gets the election directly from the repo.

2. **Improved frontend results parsing**: Added better logging and more robust parsing logic to handle all possible API response formats.

3. **Created diagnostic tools**:
   - `test_api.sh` - Quick bash script to test API endpoint
   - `debug_results.exs` - Elixir script to debug results calculation
   - `verify_votes.exs` - Check if votes exist in database
   - `postman_collection.json` - Postman collection for manual testing

## How to Diagnose

### Step 1: Check if votes exist
```bash
cd servers/elections
mix run scripts/verify_votes.exs walnut-hills-high-school-2025
```

This will show:
- Database path
- Vote count
- Sample votes if any

### Step 2: Test API directly
```bash
cd servers/elections
./scripts/test_api.sh walnut-hills-high-school-2025
```

Or use Postman:
1. Import `postman_collection.json` into Postman
2. Set `base_url` variable to `http://localhost:4000`
3. Run "Get Election Results" request
4. Check response structure

### Step 3: Check browser console
1. Open browser DevTools (F12)
2. Go to Results tab
3. Check Console for:
   - `[DEBUG] Raw API response:` - Shows what API returned
   - `[DEBUG] Processed results` - Shows parsed structure
4. Check Network tab for API response

### Step 4: Check server logs
Look for:
- `[DEBUG] calculate_all_results` - Shows vote count found
- `[DEBUG] submit_vote` - Confirms votes are being saved
- Any error messages

## Expected API Response Structure

```json
{
  "election_identifier": "walnut-hills-high-school-2025",
  "results": {
    "results": [
      {
        "ballot_title": "Student Body President",
        "candidates": [...],
        "vote_count": 10,
        "results": {
          "ranked_pairs": {...},
          "shulze": {...},
          ...
        }
      }
    ],
    "metadata": {
      "total_votes": 10,
      "vote_timestamps": [...],
      "voting_start": "2025-11-01T00:00:00Z",
      "voting_end": "2025-12-01T00:00:00Z"
    }
  }
}
```

## Common Issues & Fixes

### Issue: No votes in database
**Fix**: Submit test votes using the UI or API

### Issue: API returns empty `results.results` array
**Possible causes**:
- Election config has no ballots
- `calculate_all_results` is returning empty array
- Check server logs for errors

### Issue: Frontend shows "No votes submitted yet"
**Check**:
- Browser console for parsing errors
- Network tab for actual API response
- Verify `data.results.results` is an array

### Issue: Database context problems
**Fix**: Already fixed by removing double `with_repo` call

## Next Steps

1. Run `verify_votes.exs` to confirm votes exist
2. Run `test_api.sh` to see raw API response
3. Check browser console for parsing issues
4. If votes exist but results don't show, check server logs for calculation errors

