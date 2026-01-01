# Planned Implementation: Three-Tier Tie Categorization

## Summary of Planned Changes

### Current State
- Two categories: Statistical Ties and Ambiguous Ordering
- Notation: Parentheses for ambiguous groups

### Planned State
- Three categories: Statistical Ties, Peculiar Ties, and Ambiguous Ties
- Notation: Superscript symbols (* for peculiar, † for ambiguous)

## Three Categories

### 1. Statistical Ties
**Definition**: True ties based on algorithm metrics where the ordering is meaningful and the tie is a valid result.

**Characteristics**:
- Have algorithm metrics (score, approval count, vote count, etc.)
- Same metric value indicates true equality
- The tie is meaningful - they are truly equal
- Ordering is known (they're tied at a position)

**Examples**:
- Score: Alice 4.5, Bob 4.5 (both 1st)
- Approval: Alice 85, Bob 85 (both 1st)
- IRV/STV: Alice 45 votes, Bob 45 votes when elected (both 1st)

**Notation**: No special symbol
- "Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>3rd</sup>"

### 2. Peculiar Ties
**Definition**: Ties based on algorithm metrics, but the metrics don't represent a true preference ordering - they're algorithmic artifacts.

**Characteristics**:
- Have algorithm metrics (path strength, win count, etc.)
- Same metric value, but the metric itself is not a true ordering
- The tie is an algorithmic result, not necessarily a true preference tie
- Ordering is based on algorithm mechanics, not voter preferences

**Examples**:
- Schulze: All winners have path strength 45 (algorithm metric, but path strength doesn't directly represent preference)
- Ranked Pairs: All Condorcet winners with same win count (algorithm metric, but win count is algorithmic, not direct preference)
- Cases where algorithm provides a metric but it's not a "true" ordering metric

**Notation**: Superscript asterisk (*)
- "Alice<sup>1st*</sup>, Bob<sup>1st*</sup>, Charlie<sup>3rd*</sup>"
- Or: "Alice<sup>1st*</sup>, Bob<sup>2nd*</sup>, Charlie<sup>2nd*</sup>"

### 3. Ambiguous Ties
**Definition**: No ordering information available - cannot determine order at all.

**Characteristics**:
- No algorithm metrics available
- Or metrics are incomplete/unreliable
- Order is truly unknown
- Cannot determine preference order

**Examples**:
- Current IRV/STV: Chronological order only, no vote count tracking
- Algorithm error: No metrics calculated
- Incomplete data: Partial algorithm results

**Notation**: Superscript dagger (†)
- "Alice<sup>1st†</sup>, Bob<sup>2nd†</sup>, Charlie<sup>3rd†</sup>"
- Or: "(Alice<sup>1st†</sup>, Bob<sup>1st†</sup>, Charlie<sup>1st†</sup>)" if all ambiguous

## Notation Examples

### Statistical Tie
"Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
- Bob and Charlie statistically tied for 2nd
- No special symbol

### Peculiar Tie
"Alice<sup>1st*</sup>, Bob<sup>2nd*</sup>, Charlie<sup>2nd*</sup>, David<sup>4th*</sup>"
- Bob and Charlie peculiarly tied for 2nd (algorithm metric same, but not true preference)
- Asterisk indicates peculiar tie

### Ambiguous Tie
"Alice<sup>1st†</sup>, Bob<sup>2nd†</sup>, Charlie<sup>3rd†</sup>"
- Order is unknown (no metrics available)
- Dagger indicates ambiguous ordering

### Mixed Example
"Alice<sup>1st</sup>, Bob<sup>2nd*</sup>, Charlie<sup>2nd*</sup>, (David<sup>4th†</sup>, Eve<sup>4th†</sup>)"
- Alice: Statistical (true tie/ordering)
- Bob and Charlie: Peculiar (algorithm metric, not true ordering)
- David and Eve: Ambiguous (no ordering info) - parentheses for ambiguous group

## Algorithm Classification

### Statistical Ties (True Ordering Metrics)
- **Score**: Average score (direct preference measure)
- **Approval**: Approval count (direct preference measure)
- **IRV/STV** (after tracking): Vote count when elected (direct preference measure)
- **Coombs** (after tracking): Vote count when elected (direct preference measure)

### Peculiar Ties (Algorithm Metrics, Not True Ordering)
- **Schulze**: Path strength (algorithmic metric, not direct preference)
- **Ranked Pairs**: Win count in locked pairs (algorithmic metric, not direct preference)
- Cases where algorithm provides metric but it's derived/algorithmic

### Ambiguous Ties (No Ordering Information)
- **IRV/STV** (current): Chronological only, no vote counts
- **Coombs** (current): Chronological only, no vote counts
- Algorithm errors: No metrics calculated
- Incomplete data: Partial results

## Documentation Updates Planned

### Files to Update

1. **`WINNER_ORDERING_NOTATION.md`**
   - Replace two-category system with three-category system
   - Update notation examples to use * and †
   - Remove parentheses notation (except for ambiguous groups)
   - Add examples of each category
   - Clarify distinction between statistical, peculiar, and ambiguous

2. **`STATISTICAL_TIE_VS_AMBIGUOUS_ANALYSIS.md`**
   - Expand to include "peculiar ties" category
   - Analyze when metrics represent true ordering vs algorithmic artifacts
   - Update examples to show three categories

3. **`AMBIGUOUS_ORDERING_VS_INDETERMINATE_RESULTS.md`**
   - Add peculiar ties as separate category
   - Clarify that peculiar ties can exist with full set of winners
   - Update examples

4. **`WINNER_ORDERING_FEATURE_PLAN.md`**
   - Update data structure to include `tie_type: "statistical" | "peculiar" | "ambiguous"`
   - Update frontend rendering examples
   - Add peculiar tie detection logic

5. **`WINNER_ORDERING_ANALYSIS.md`**
   - Update algorithm-by-algorithm analysis
   - Classify each algorithm's tie type
   - Show which algorithms produce which type of ties

## Data Structure Changes

### Current (Planned)
```elixir
%{
  candidate: "Alice",
  position: 1,
  metric_value: 4.5,
  tied: true,
  ambiguous: false
}
```

### New (Planned)
```elixir
%{
  candidate: "Alice",
  position: 1,
  metric_value: 4.5,
  tied: true,
  tie_type: "statistical" | "peculiar" | "ambiguous"  # New field
}
```

## Implementation Logic (Planned)

### Determining Tie Type

```elixir
defp determine_tie_type(algorithm_result, method_name, metric_value, other_candidates) do
  cond do
    # No metric available
    is_nil(metric_value) -> "ambiguous"
    
    # True ordering metrics (direct preference measures)
    method_name in ["score", "approval"] -> "statistical"
    method_name in ["irv_stv", "coombs"] and has_vote_count_tracking?() -> "statistical"
    
    # Algorithmic metrics (not direct preference)
    method_name in ["schulze", "ranked_pairs"] -> "peculiar"
    
    # No ordering info
    true -> "ambiguous"
  end
end
```

## Frontend Rendering (Planned)

```typescript
function formatWinnersWithOrdering(winnerOrder: WinnerOrder[]): string {
  const parts: string[] = [];
  
  for (const candidate of winnerOrder) {
    const ordinal = getOrdinal(candidate.position);
    let symbol = '';
    
    switch (candidate.tie_type) {
      case 'statistical':
        symbol = '';  // No symbol
        break;
      case 'peculiar':
        symbol = '*';  // Asterisk
        break;
      case 'ambiguous':
        symbol = '†';  // Dagger
        break;
    }
    
    parts.push(`${candidate.candidate}<sup>${ordinal}${symbol}</sup>`);
  }
  
  return parts.join(', ');
}
```

## Summary of Planned Changes

1. **Add third category**: "Peculiar Ties" for algorithmic metrics that aren't true ordering
2. **Update notation**: Use * for peculiar, † for ambiguous (remove parentheses except for ambiguous groups)
3. **Classify algorithms**: Determine which produce statistical, peculiar, or ambiguous ties
4. **Update data structure**: Add `tie_type` field
5. **Update documentation**: All relevant docs updated with three-category system
6. **Update frontend**: Render with appropriate superscript symbols

## Key Distinctions

- **Statistical**: True preference ordering (score, approval, vote count)
- **Peculiar**: Algorithmic metric (path strength, win count) - not direct preference
- **Ambiguous**: No ordering information available

This provides more granular information about the nature of ties while maintaining clear visual distinction in the notation.

