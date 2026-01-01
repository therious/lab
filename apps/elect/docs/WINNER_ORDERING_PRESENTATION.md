# Winner Ordering Presentation

## Overview

The UI presents winner ordering information from the server's `winner_order` field using a three-tier tie classification system. This document describes the UI presentation details.

**Related Server Documentation:**
- [Winner Ordering Notation](../../../servers/elections/docs/WINNER_ORDERING_NOTATION.md) - Data structure and tie classification logic
- [Winner Ordering Analysis](../../../servers/elections/docs/WINNER_ORDERING_ANALYSIS.md) - Algorithm-by-algorithm ordering details

## Three-Tier Tie System

The server classifies ties into three categories:
- **Statistical Ties**: True preference ordering metrics (score, approval count, vote count)
- **Peculiar Ties**: Algorithmic metrics that don't represent direct preference (path strength, win count)
- **Ambiguous Ties**: No ordering information available

## Visual Presentation

### Position Notation

- **Format**: Superscript numbers (not ordinals): 1, 2, 3, 4, etc.
- **Example**: "Alice<sup>1</sup>, Bob<sup>2</sup>, Charlie<sup>2</sup>"
- **Rationale**: Numbers are more compact and consistent than ordinals (1st, 2nd, 3rd)

### Tie Symbols

- **Statistical Ties**: No special symbol (clean appearance for true ties)
- **Peculiar Ties**: Superscript asterisk (*) - "Alice<sup>1*</sup>"
- **Ambiguous Ties**: Superscript dagger (†) - "Alice<sup>1†</sup>"
- **Symbol Size**: Numbers and symbols are same size (not nested superscript)

### Styling

When candidates are tied, the superscript is styled as:
- **Color**: Blue (#0066cc)
- **Text Decoration**: Dotted underline
- **Cursor**: Help cursor (indicates interactive element)
- **Rationale**: Makes tied positions clearly identifiable and indicates additional information is available

### Tooltips

Tied superscripts display tooltips on hover with specific language:

- **Statistical**: "X, Y, and Z are statistically tied for nth place"
- **Peculiar**: "X, Y, and Z are tied for nth place by metrics peculiar to this voting method"
- **Ambiguous**: "X, Y and Z are only effectively tied for nth place by this algorithm, having no method with which to order relative to each other"

**Implementation**: Uses HTML `title` attribute for native browser tooltips.

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

## Implementation

The UI receives `winner_order` data from the server API:

```typescript
interface WinnerOrder {
  candidate: string;
  position: number;
  metric_value: number | null;
  tied: boolean;
  tie_type: "statistical" | "peculiar" | "ambiguous" | null;
}
```

The `formatWinnersWithOrdering` utility function (in `components/utils.tsx`) renders this data with appropriate symbols and tooltips.

## Related UI Features

- **Results View**: Displays winner ordering in algorithm results sections
- **Method Grouping**: Results are grouped by method family (Condorcet, Rating, Runoff)
- **Status Labels**: Algorithm statuses (Final, Leading, Indeterminate, etc.) are displayed alongside winners

