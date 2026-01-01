# Winner Ordering Notation Specification

## Overview

The system uses a three-tier classification for winner ordering ties:
- **Statistical Ties**: True preference ordering metrics (score, approval count, vote count)
- **Peculiar Ties**: Algorithmic metrics that don't represent direct preference (path strength, win count)
- **Ambiguous Ties**: No ordering information available

## Notation Rules

### 1. Superscripts for Positions
- Use superscript numbers (not ordinals): 1, 2, 3, 4, etc.
- Example: "Alice<sup>1</sup>"
- Numbers and symbols (*, †) are same size (not nested superscript)

### 2. Statistical Ties
- When candidates have the same direct preference metric (score, approval count, vote count)
- Both get the same position number
- Next position is skipped
- **No special symbol** - these are clear statistical ties

**Example**: "Alice<sup>1</sup>, Bob<sup>2</sup>, Charlie<sup>2</sup>, David<sup>4</sup>"
- Alice is 1st
- Bob and Charlie are statistically tied for 2nd (same metric value)
- David is 4th (no 3rd because Bob and Charlie both occupy 2nd)

### 3. Peculiar Ties
- When candidates have the same algorithmic metric (path strength, win count) that doesn't represent direct preference
- Both get the same position number with asterisk (*)
- **Superscript asterisk** indicates peculiar tie

**Example**: "Alice<sup>1*</sup>, Bob<sup>2*</sup>, Charlie<sup>2*</sup>, David<sup>4*</sup>"
- Bob and Charlie are peculiarly tied for 2nd (algorithm metric same, but not true preference)
- Asterisk indicates peculiar tie

### 4. Ambiguous Ties
- When no ordering information is available
- Both get the same position number with dagger (†)
- **Superscript dagger** indicates ambiguous ordering

**Example**: "Alice<sup>1†</sup>, Bob<sup>2†</sup>, Charlie<sup>3†</sup>"
- Order is unknown (no metrics available)
- Dagger indicates ambiguous ordering

### 5. Mixed Example
"Alice<sup>1</sup>, Bob<sup>2*</sup>, Charlie<sup>2*</sup>, David<sup>4†</sup>, Eve<sup>4†</sup>"
- Alice: Statistical (true tie/ordering)
- Bob and Charlie: Peculiar (algorithm metric, not true ordering)
- David and Eve: Ambiguous (no ordering info)

## Algorithm Classification

### Statistical Ties (True Ordering Metrics)
- **Score**: Average score (direct preference measure)
- **Approval**: Approval count (direct preference measure)
- **IRV/STV**: Vote count when elected (direct preference measure, when tracked)
- **Coombs**: Vote count when elected (direct preference measure, when tracked)

### Peculiar Ties (Algorithm Metrics, Not True Ordering)
- **Schulze**: Path strength (algorithmic metric, not direct preference)
- **Ranked Pairs**: Win count in locked pairs (algorithmic metric, not direct preference)

### Ambiguous Ties (No Ordering Information)
- **IRV/STV**: When vote counts are not tracked (chronological order only)
- **Coombs**: When vote counts are not tracked (chronological order only)
- Algorithm errors: No metrics calculated
- Incomplete data: Partial algorithm results

## Display Examples

### Statistical Tie
"Alice<sup>1</sup>, Bob<sup>2</sup>, Charlie<sup>2</sup>, David<sup>4</sup>"
- Bob and Charlie statistically tied for 2nd
- No special symbol

### Peculiar Tie
"Alice<sup>1*</sup>, Bob<sup>2*</sup>, Charlie<sup>2*</sup>, David<sup>4*</sup>"
- Bob and Charlie peculiarly tied for 2nd
- Asterisk indicates peculiar tie

### Ambiguous Tie
"Alice<sup>1†</sup>, Bob<sup>2†</sup>, Charlie<sup>3†</sup>"
- Order is unknown (no metrics available)
- Dagger indicates ambiguous ordering

### Mixed Example
"Alice<sup>1</sup>, Bob<sup>2*</sup>, Charlie<sup>2*</sup>, David<sup>4†</sup>, Eve<sup>4†</sup>"
- Alice: Statistical (true tie/ordering)
- Bob and Charlie: Peculiar (algorithm metric, not true ordering)
- David and Eve: Ambiguous (no ordering info)

## Tooltips

When candidates are tied, the superscript is styled as a hyperlink (blue, dotted underline) with a tooltip:

- **Statistical**: "X, Y, and Z are statistically tied for nth place"
- **Peculiar**: "X, Y, and Z are tied for nth place by metrics peculiar to this voting method"
- **Ambiguous**: "X, Y and Z are only effectively tied for nth place by this algorithm, having no method with which to order relative to each other"

## Implementation

The `winner_order` field in algorithm results contains:
```elixir
%{
  candidate: "Alice",
  position: 1,
  metric_value: 4.5,
  tied: true,
  tie_type: "statistical" | "peculiar" | "ambiguous" | nil
}
```

Frontend renders this with appropriate superscript symbols and tooltips.

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
