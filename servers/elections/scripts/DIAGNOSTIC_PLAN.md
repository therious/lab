# Diagnostic Plan for Missing Results

## Problem
Results are not appearing in the ResultsView component.

## Diagnostic Steps

### 1. Check API Response Structure
Run: `./scripts/test_api.sh walnut-hills-high-school-2025`

Expected response structure:
```json
{
  "election_identifier": "...",
  "results": {
    "results": [...],  // Array of ballot results
    "metadata": {
      "total_votes": 0,
      "vote_timestamps": [],
      "voting_start": "...",
      "voting_end": "..."
    }
  }
}
```

### 2. Verify Votes Exist in Database
Run: `mix run scripts/verify_votes.exs walnut-hills-high-school-2025`

This will show:
- Database path
- Vote count
- Sample votes if any exist

### 3. Check Server Logs
Look for:
- `[DEBUG] calculate_all_results` messages
- `[DEBUG] submit_vote` messages
- Any error messages during results calculation

### 4. Test API Directly
Use Postman collection: `postman_collection.json`
- Import into Postman
- Test "Get Election Results" endpoint
- Check response structure

### 5. Check Frontend Console
Open browser DevTools and check:
- Console logs from `processResults` function
- Network tab for API response
- Any JavaScript errors

## Common Issues

1. **No votes in database**: Election has no votes submitted yet
2. **API structure mismatch**: Frontend expecting different structure than API returns
3. **Database isolation**: Votes in wrong database (check db_path in logs)
4. **Empty ballots array**: Election config has no ballots
5. **Results calculation error**: Algorithm errors preventing results from being calculated

## Quick Fixes

If votes exist but results don't show:
- Check browser console for parsing errors
- Verify API response matches expected structure
- Check that `data.results.results` is an array

If no votes exist:
- Submit test votes using the API or UI
- Check that votes are being saved to correct database

