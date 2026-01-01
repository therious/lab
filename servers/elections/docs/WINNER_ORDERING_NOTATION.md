# Winner Ordering Data Structure

## Overview

The system uses a three-tier classification for winner ordering ties:
- **Statistical Ties**: True preference ordering metrics (score, approval count, vote count)
- **Peculiar Ties**: Algorithmic metrics that don't represent direct preference (path strength, win count)
- **Ambiguous Ties**: No ordering information available

**UI Presentation**: See [Winner Ordering Presentation](../../apps/elect/docs/WINNER_ORDERING_PRESENTATION.md) for how this data is displayed in the UI.

## Data Structure

The `winner_order` field in algorithm results contains an array of maps:

```elixir
%{
  candidate: "Alice",
  position: 1,
  metric_value: 4.5,
  tied: true,
  tie_type: "statistical" | "peculiar" | "ambiguous" | nil
}
```

### Fields

- **`candidate`**: Candidate name (string)
- **`position`**: Ordinal position (integer: 1, 2, 3, ...)
- **`metric_value`**: The metric used for ordering (number or nil)
- **`tied`**: Boolean indicating if this candidate is tied with others at this position
- **`tie_type`**: Classification of the tie type, or `nil` if not tied

## Algorithm Classification

### Statistical Ties (True Ordering Metrics)
- **Score**: Average score (direct preference measure)
- **Approval**: Approval count (direct preference measure)
- **IRV/STV**: Vote count when elected (direct preference measure, when tracked)
- **Coombs**: Vote count when elected (direct preference measure, when tracked)

**When**: Candidates have the same metric value, and the metric represents direct voter preference.

### Peculiar Ties (Algorithm Metrics, Not True Ordering)
- **Schulze**: Path strength (algorithmic metric, not direct preference)
- **Ranked Pairs**: Win count in locked pairs (algorithmic metric, not direct preference)

**When**: Candidates have the same metric value, but the metric is an algorithmic artifact rather than a direct preference measure.

### Ambiguous Ties (No Ordering Information)
- **IRV/STV**: When vote counts are not tracked (chronological order only)
- **Coombs**: When vote counts are not tracked (chronological order only)
- Algorithm errors: No metrics calculated
- Incomplete data: Partial algorithm results

**When**: No ordering information is available, or the algorithm cannot determine relative order.

## Position Calculation

Positions are calculated such that:
- Tied candidates share the same position number
- The next position after a tie skips numbers (e.g., if 2nd is tied, next is 4th)
- Positions are sequential integers starting from 1

**Example**:
- Alice: position 1
- Bob and Charlie: both position 2 (tied)
- David: position 4 (no position 3 because Bob and Charlie both occupy 2nd)

## Summary Table

| Algorithm | Tie Type | When |
|-----------|----------|------|
| **Score** | Statistical | Same score |
| **Approval** | Statistical | Same approval count |
| **Ranked Pairs** | Peculiar | Same win count |
| **Schulze** | Peculiar | Same path strength |
| **IRV/STV** | Statistical* | Same vote count (when tracked) |
| **IRV/STV** | Ambiguous | No vote count tracking |
| **Coombs** | Statistical* | Same vote count (when tracked) |
| **Coombs** | Ambiguous | No vote count tracking |

*When vote counts are tracked during election

## Related Documentation

- [Winner Ordering Analysis](./WINNER_ORDERING_ANALYSIS.md) - Algorithm-by-algorithm ordering details
- [Winner Ordering Presentation](../../apps/elect/docs/WINNER_ORDERING_PRESENTATION.md) - UI presentation of this data
