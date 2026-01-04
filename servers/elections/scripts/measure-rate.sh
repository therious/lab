#!/bin/bash
# Measure actual vote submission rate

BASE_URL="${ELECTIONS_URL:-http://localhost:4000}"
ELECTION_ID="${ELECTION_ID:-2026-general-election}"

echo "Measuring vote submission rate for $ELECTION_ID..."
echo ""

# Get initial count
START_COUNT=$(curl -s "${BASE_URL}/api/dashboard/${ELECTION_ID}" 2>/dev/null | jq -r '.metadata.total_votes // 0' 2>/dev/null || echo "0")
echo "Initial vote count: $START_COUNT"
echo "Measuring for 10 seconds..."
echo ""

# Wait 10 seconds
sleep 10

# Get final count
END_COUNT=$(curl -s "${BASE_URL}/api/dashboard/${ELECTION_ID}" 2>/dev/null | jq -r '.metadata.total_votes // 0' 2>/dev/null || echo "0")
echo "Final vote count: $END_COUNT"
echo ""

# Calculate rate
DIFF=$((END_COUNT - START_COUNT))
RATE=$(echo "scale=2; $DIFF / 10" | bc 2>/dev/null || echo "0")

echo "========================================="
echo "Votes submitted in 10 seconds: $DIFF"
echo "Effective submission rate: $RATE votes/second"
echo "========================================="

