# Winner Ordering Feature Plan

## Goal
Add preference ordering to multiple winners with notation:
- Ordinal positions: 1st, 2nd, 3rd, etc.
- Statistical ties: "2nd, 2nd, 4th" (two tied for 2nd, next is 4th)
- Ambiguous ordering: "(1st, 1st, 1st)" for candidates where order is unknown

## Feasibility Analysis

### Can This Be Done Without Breaking Anything?

**Yes**, with careful design:
1. Add ordering metadata to algorithm results
2. Keep existing `winners` list unchanged (backward compatible)
3. Add optional `winner_order` field with ordering information
4. Frontend can choose to display with or without ordering

## Algorithm-by-Algorithm Analysis

### 1. Score Voting
**Current**: Returns winners sorted by score
**Available Data**: `candidate_scores` map with all scores
**Ordering Feasibility**: ✅ **Fully feasible**

**Implementation**:
- Already sorted by score
- Can detect ties: same score = statistical tie
- Can assign: 1st, 2nd, 3rd based on score
- No ambiguity possible

**Example Result**:
```elixir
%{
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, score: 4.5, tied: false},
    %{candidate: "Bob", position: 2, score: 4.2, tied: false},
    %{candidate: "Charlie", position: 3, score: 4.2, tied: true}  # Tied with Bob
  ]
}
```

### 2. Approval Voting
**Current**: Returns winners sorted by approval count
**Available Data**: `candidate_approvals` map with all counts
**Ordering Feasibility**: ✅ **Fully feasible**

**Implementation**:
- Already sorted by approval count
- Can detect ties: same count = statistical tie
- Can assign: 1st, 2nd, 3rd based on count
- No ambiguity possible

**Example Result**:
```elixir
%{
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, approvals: 85, tied: false},
    %{candidate: "Bob", position: 2, approvals: 72, tied: false},
    %{candidate: "Charlie", position: 2, approvals: 72, tied: true}  # Tied with Bob
  ]
}
```

### 3. Ranked Pairs
**Current**: Sometimes sorted by win count, sometimes arbitrary
**Available Data**: `locked_pairs`, `pairwise` matrices, win counts
**Ordering Feasibility**: ⚠️ **Partially feasible**

**Case 1: Not all Condorcet winners**
- Has win counts available
- Can sort by win count
- Can detect ties: same win count = statistical tie
- **Feasible**: ✅

**Case 2: All Condorcet winners**
- No win count differentiation (all beat everyone)
- Could use pairwise comparison strength
- Could use total pairwise victories
- **Feasible**: ✅ (with additional calculation)

**Ambiguity**: If all Condorcet winners have identical pairwise records, order is ambiguous

**Example Result**:
```elixir
%{
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, win_count: 5, tied: false},
    %{candidate: "Bob", position: 2, win_count: 4, tied: false},
    %{candidate: "Charlie", position: 2, win_count: 4, tied: true}  # Tied with Bob
  ]
}
```

**For Condorcet winners**:
```elixir
%{
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, ambiguous: false},  # If we can differentiate
    %{candidate: "Bob", position: 1, ambiguous: true},     # If truly tied
    %{candidate: "Charlie", position: 1, ambiguous: true}  # If truly tied
  ]
}
```

### 4. Schulze
**Current**: Sometimes sorted by path strength, sometimes arbitrary
**Available Data**: `strongest_paths` map, pairwise matrix
**Ordering Feasibility**: ⚠️ **Partially feasible**

**Case 1: More winners than needed**
- Already calculates total path strength
- Can sort by path strength
- Can detect ties: same strength = statistical tie
- **Feasible**: ✅

**Case 2: Exactly N winners**
- Could calculate total path strength (same as case 1)
- **Feasible**: ✅ (with additional calculation)

**Ambiguity**: If all winners have identical path strengths, order is ambiguous

**Example Result**:
```elixir
%{
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, path_strength: 45, tied: false},
    %{candidate: "Bob", position: 2, path_strength: 42, tied: false},
    %{candidate: "Charlie", position: 2, path_strength: 42, tied: true}
  ]
}
```

### 5. IRV/STV
**Current**: Chronological order (when elected)
**Available Data**: Vote counts at time of election, quota
**Ordering Feasibility**: ⚠️ **Partially feasible with modifications**

**Current Implementation**:
- Winners added as `winners ++ new_winners_names`
- No tracking of vote counts when elected
- No comparison between winners

**What We'd Need**:
- Track vote count when each winner is elected
- Store: `[{winner, vote_count, round}]` instead of just `[winner]`
- Sort by vote count (or round if counts are same)

**Modifications Required**:
```elixir
# Instead of:
winners ++ new_winners_names

# Return:
winners_with_metadata = 
  winners ++ 
  Enum.map(new_winners_names, fn winner ->
    vote_count = get_vote_count_for_winner(rankings, winner)
    {winner, vote_count, current_round}
  end)
```

**Feasibility**: ✅ **Feasible with code changes**

**Example Result**:
```elixir
%{
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, vote_count: 45, round: 1, tied: false},
    %{candidate: "Bob", position: 2, vote_count: 38, round: 2, tied: false},
    %{candidate: "Charlie", position: 2, vote_count: 38, round: 3, tied: true}  # Tied with Bob
  ]
}
```

**Ambiguity**: If winners elected in same round with same vote count, order is ambiguous

### 6. Coombs
**Current**: Chronological order (when elected)
**Available Data**: Vote counts at time of election, quota
**Ordering Feasibility**: ⚠️ **Partially feasible with modifications**

**Same as IRV/STV**:
- Need to track vote counts when elected
- Same modifications required
- **Feasible**: ✅ (with code changes)

## Implementation Options

### Option 1: Minimal Change - Post-Process Ordering
**Approach**: Keep algorithms unchanged, add ordering logic in `Voting.calculate_all_results`

**Pros**:
- No algorithm changes
- Centralized ordering logic
- Easy to test

**Cons**:
- May not have all needed data (e.g., IRV/STV vote counts)
- Less accurate for some methods

**Implementation**:
```elixir
defp add_winner_ordering(algorithm_result, method_name) do
  case method_name do
    "score" -> order_by_score(algorithm_result)
    "approval" -> order_by_approval(algorithm_result)
    "ranked_pairs" -> order_by_win_count(algorithm_result)
    "schulze" -> order_by_path_strength(algorithm_result)
    "irv_stv" -> order_by_election_metadata(algorithm_result)  # If available
    "coombs" -> order_by_election_metadata(algorithm_result)  # If available
  end
end
```

### Option 2: Algorithm Modifications - Return Metadata
**Approach**: Modify algorithms to return ordering information

**Pros**:
- Most accurate ordering
- Has all necessary data
- Can detect ties and ambiguities

**Cons**:
- Requires changes to all algorithms
- More complex
- Need to maintain backward compatibility

**Implementation**:
```elixir
# Each algorithm returns:
%{
  method: "score",
  winners: ["Alice", "Bob", "Charlie"],
  winner_order: [
    %{candidate: "Alice", position: 1, metric: 4.5, tied: false, ambiguous: false},
    %{candidate: "Bob", position: 2, metric: 4.2, tied: false, ambiguous: false},
    %{candidate: "Charlie", position: 2, metric: 4.2, tied: true, ambiguous: false}
  ],
  # ... other fields
}
```

### Option 3: Hybrid - Enhance Algorithms Selectively
**Approach**: 
- Keep Score/Approval as-is (already ordered)
- Enhance Ranked Pairs/Schulze to always calculate ordering
- Modify IRV/STV/Coombs to track election metadata

**Pros**:
- Minimal changes where not needed
- Targeted improvements where needed
- Balanced approach

**Cons**:
- Inconsistent implementation
- Some methods still need post-processing

### Option 4: New Ordering Service
**Approach**: Create separate `WinnerOrdering` module that takes algorithm results and adds ordering

**Pros**:
- Separation of concerns
- Easy to test
- Can be applied to any algorithm result
- Can be toggled on/off

**Cons**:
- May not have all data needed
- Additional layer of complexity

**Implementation**:
```elixir
defmodule Elections.WinnerOrdering do
  def add_ordering(algorithm_result, method_name, votes, ballot) do
    case method_name do
      "score" -> order_by_available_metric(algorithm_result, :scores)
      "approval" -> order_by_available_metric(algorithm_result, :approvals)
      "ranked_pairs" -> calculate_win_counts_and_order(algorithm_result, votes, ballot)
      "schulze" -> calculate_path_strength_and_order(algorithm_result, votes, ballot)
      "irv_stv" -> order_by_election_order(algorithm_result)  # Chronological only
      "coombs" -> order_by_election_order(algorithm_result)  # Chronological only
    end
  end
end
```

## Recommended Approach: Option 3 (Hybrid)

### Phase 1: Quick Wins (No Algorithm Changes)
1. **Score & Approval**: Already ordered, just add position numbers
2. **Ranked Pairs**: Calculate win counts for all cases (even Condorcet)
3. **Schulze**: Calculate path strength for all cases

### Phase 2: Enhance IRV/STV and Coombs
1. Modify to track vote counts when elected
2. Return metadata: `[{winner, vote_count, round}]`
3. Sort by vote count (or round if tied)

### Phase 3: Standardize Output Format
1. All algorithms return `winner_order` field
2. Consistent structure across all methods
3. Frontend can display with ordinal notation

## Data Structure Design

```elixir
%{
  method: "score",
  winners: ["Alice", "Bob", "Charlie"],  # Keep for backward compatibility
  winner_order: [
    %{
      candidate: "Alice",
      position: 1,              # Ordinal position (1, 2, 3, ...)
      metric_value: 4.5,        # Score/approval/vote_count/etc.
      tied: false,              # True if statistically tied with next
      ambiguous: false,         # True if order is unknown/ambiguous
      tied_with: []            # List of candidates tied at this position
    },
    %{
      candidate: "Bob",
      position: 2,
      metric_value: 4.2,
      tied: true,
      ambiguous: false,
      tied_with: ["Charlie"]
    },
    %{
      candidate: "Charlie",
      position: 2,              # Same position as Bob (tied)
      metric_value: 4.2,
      tied: true,
      ambiguous: false,
      tied_with: ["Bob"]
    }
  ]
}
```

## Frontend Display Format

### Notation Rules:
1. **Single winner**: "Alice 1st"
2. **Ordered winners**: "Alice 1st, Bob 2nd, Charlie 3rd"
3. **Statistical ties**: "Alice 1st, Bob 2nd, Charlie 2nd, David 4th"
4. **Ambiguous ordering**: "(Alice 1st, Bob 1st, Charlie 1st)" or "Alice (1st), Bob (1st), Charlie (1st)"

### Implementation:
```typescript
function formatWinnersWithOrdering(winnerOrder: WinnerOrder[]): string {
  const groups = groupByPosition(winnerOrder);
  const parts: string[] = [];
  
  for (const [position, candidates] of Object.entries(groups)) {
    const isAmbiguous = candidates.some(c => c.ambiguous);
    const prefix = isAmbiguous ? '(' : '';
    const suffix = isAmbiguous ? ')' : '';
    const ordinal = getOrdinal(parseInt(position));
    
    if (candidates.length === 1) {
      parts.push(`${prefix}${candidates[0].candidate} ${ordinal}${suffix}`);
    } else {
      // Multiple tied at this position
      const names = candidates.map(c => c.candidate).join(', ');
      parts.push(`${prefix}${names} ${ordinal}${suffix}`);
    }
  }
  
  return parts.join(', ');
}
```

## Backward Compatibility

**Critical**: Must not break existing code

**Strategy**:
1. Keep `winners` list unchanged
2. Add `winner_order` as optional field
3. Frontend checks for `winner_order`, falls back to `winners` if absent
4. Algorithms can be updated incrementally

**Migration Path**:
- Phase 1: Add `winner_order` to Score/Approval (already have data)
- Phase 2: Add to Ranked Pairs/Schulze (calculate additional metrics)
- Phase 3: Modify IRV/STV/Coombs to track metadata
- Phase 4: Frontend uses `winner_order` when available

## Testing Strategy

1. **Unit Tests**: Each ordering function
2. **Integration Tests**: Full algorithm results with ordering
3. **Edge Cases**:
   - All winners tied
   - All winners ambiguous
   - Single winner
   - Mixed ties and unambiguous
4. **Backward Compatibility**: Verify old code still works

## Estimated Effort

- **Phase 1** (Score/Approval/Ranked Pairs/Schulze): 2-3 days
- **Phase 2** (IRV/STV/Coombs modifications): 3-4 days
- **Phase 3** (Frontend display): 2 days
- **Testing**: 2 days
- **Total**: ~2 weeks

## Recommendation

**Proceed with Option 3 (Hybrid Approach)**:
1. Start with Phase 1 (quick wins)
2. Enhance IRV/STV/Coombs in Phase 2
3. Standardize and add frontend in Phase 3
4. Maintain backward compatibility throughout

This provides:
- ✅ Immediate value (Score/Approval ordering)
- ✅ Incremental improvement
- ✅ No breaking changes
- ✅ Clear path forward

