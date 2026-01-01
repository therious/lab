# Multiple Winners Ordering Analysis

## Summary

All algorithms now provide winner ordering information via the `winner_order` field. The ordering uses a three-tier tie classification system: statistical, peculiar, and ambiguous.

## Algorithm-by-Algorithm Analysis

### 1. Score Voting
**Ordering**: ✅ **Ordered by preference** (highest to lowest score)
**Tie Type**: **Statistical** (direct preference metric)

- Explicitly sorted by score (highest first)
- Most preferred to least preferred
- Ties: Same score = statistical tie

### 2. Approval Voting
**Ordering**: ✅ **Ordered by preference** (highest to lowest approval count)
**Tie Type**: **Statistical** (direct preference metric)

- Explicitly sorted by approval count (highest first)
- Most preferred to least preferred
- Ties: Same approval count = statistical tie

### 3. Ranked Pairs
**Ordering**: ⚠️ **Ordered by win count** (algorithmic metric)
**Tie Type**: **Peculiar** (algorithmic metric, not direct preference)

- Always calculates win counts for ordering
- Sorted by win count (most wins first)
- Ties: Same win count = peculiar tie
- Win count is a proxy for preference strength, but not a direct preference measure

### 4. Schulze
**Ordering**: ⚠️ **Ordered by path strength** (algorithmic metric)
**Tie Type**: **Peculiar** (algorithmic metric, not direct preference)

- Calculates total path strength for all winners
- Sorted by path strength (strongest first)
- Ties: Same path strength = peculiar tie
- Path strength is an algorithmic metric, not a direct preference measure

### 5. IRV/STV
**Ordering**: ✅ **Ordered by vote count when elected** (when tracked)
**Tie Type**: **Statistical** (when tracked) or **Ambiguous** (when not tracked)

- Tracks vote counts when candidates are elected
- Sorted by vote count (highest first)
- Ties: Same vote count = statistical tie
- If vote counts not tracked: ambiguous ordering (chronological only)

### 6. Coombs
**Ordering**: ✅ **Ordered by vote count when elected** (when tracked)
**Tie Type**: **Statistical** (when tracked) or **Ambiguous** (when not tracked)

- Tracks vote counts when candidates are elected
- Sorted by vote count (highest first)
- Ties: Same vote count = statistical tie
- If vote counts not tracked: ambiguous ordering (chronological only)

## Summary Table

| Algorithm | Ordering Status | Ordering Method | Tie Type | Reliability |
|-----------|----------------|-----------------|----------|-------------|
| **Score** | ✅ Ordered | By score (highest first) | Statistical | Always |
| **Approval** | ✅ Ordered | By approval count (highest first) | Statistical | Always |
| **Ranked Pairs** | ✅ Ordered | By win count | Peculiar | Always |
| **Schulze** | ✅ Ordered | By path strength | Peculiar | Always |
| **IRV/STV** | ✅ Ordered* | By vote count when elected | Statistical* | When tracked |
| **Coombs** | ✅ Ordered* | By vote count when elected | Statistical* | When tracked |

*When vote counts are tracked during election. Otherwise ambiguous.

## Implementation Details

All algorithms return a `winner_order` field with:
- `candidate`: Candidate name
- `position`: Ordinal position (1, 2, 3, ...)
- `metric_value`: The metric used for ordering
- `tied`: Boolean indicating if tied
- `tie_type`: "statistical", "peculiar", "ambiguous", or `nil`

The frontend displays this with:
- Numbers (not ordinals): 1, 2, 3
- Symbols: * for peculiar, † for ambiguous
- Tooltips explaining the tie type
