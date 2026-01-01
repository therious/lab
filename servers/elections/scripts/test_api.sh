#!/bin/bash

# Simple bash script to test dashboard API
# Usage: ./scripts/test_api.sh [election_identifier]

ELECTION_ID="${1:-walnut-hills-high-school-2025}"
BASE_URL="http://localhost:4000"

echo "=== Testing Dashboard API ==="
echo "Election: $ELECTION_ID"
echo "URL: $BASE_URL/api/dashboard/$ELECTION_ID"
echo ""

response=$(curl -s -w "\n%{http_code}" -H "Accept: application/json" "$BASE_URL/api/dashboard/$ELECTION_ID")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: $http_code"
echo ""
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"

if [ "$http_code" != "200" ]; then
  echo ""
  echo "✗ API returned non-200 status"
  exit 1
fi

# Check if results exist
ballots=$(echo "$body" | jq '.results // .ballots // []' 2>/dev/null)
ballot_count=$(echo "$ballots" | jq 'length' 2>/dev/null || echo "0")
total_votes=$(echo "$body" | jq '.metadata.total_votes // 0' 2>/dev/null || echo "0")

echo ""
echo "=== Analysis ==="
echo "Ballots in response: $ballot_count"
echo "Total votes: $total_votes"

if [ "$ballot_count" = "0" ]; then
  echo ""
  echo "⚠ WARNING: No ballots in response!"
fi

