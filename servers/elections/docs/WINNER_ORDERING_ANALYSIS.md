# Multiple Winners Ordering Analysis

## Question
Are multiple winners consistently listed in most-to-least preferred order, or is ordering unavailable/unreliable?

## Algorithm-by-Algorithm Analysis

### 1. Score Voting
**Ordering**: ✅ **Ordered by preference** (highest to lowest score)
```elixir
winners = candidate_scores 
  |> Enum.sort_by(fn {_candidate, score} -> -score end)  # Sort descending
  |> Enum.take(number_of_winners) 
  |> Enum.map(&elem(&1, 0))
```
- Explicitly sorted by score (highest first)
- Most preferred to least preferred
- Ties: Arbitrary order (stable sort)

### 2. Approval Voting
**Ordering**: ✅ **Ordered by preference** (highest to lowest approval count)
```elixir
winners = candidate_approvals
  |> Enum.sort_by(fn {_candidate, count} -> -count end)  # Sort descending
  |> Enum.take(number_of_winners)
  |> Enum.map(&elem(&1, 0))
```
- Explicitly sorted by approval count (highest first)
- Most preferred to least preferred
- Ties: Arbitrary order (stable sort)

### 3. Ranked Pairs
**Ordering**: ⚠️ **Conditionally ordered**

**Case 1: Enough Condorcet winners**
```elixir
if length(condorcet_winners) >= number_of_winners do
  Enum.take(condorcet_winners, number_of_winners)  # Arbitrary order
```
- **No ordering** - just takes first N Condorcet winners
- Order depends on how `Enum.filter` processes candidates
- Not preference-ordered

**Case 2: Not enough Condorcet winners**
```elixir
candidate_names
  |> Enum.map(fn name -> {name, Map.get(win_counts, name, 0)} end)
  |> Enum.sort_by(fn {_name, wins} -> -wins end)  # Sort by win count
  |> Enum.take(number_of_winners)
  |> Enum.map(&elem(&1, 0))
```
- **Ordered by win count** (most wins first)
- Win count is a proxy for preference strength
- Most preferred to least preferred (by win count)
- Ties: Arbitrary order

### 4. Schulze
**Ordering**: ⚠️ **Conditionally ordered**

**Case 1: More winners than needed**
```elixir
if length(winners) > number_of_winners do
  winners
  |> Enum.map(fn candidate ->
    total_strength = ...  # Calculate total path strength
    {candidate, total_strength}
  end)
  |> Enum.sort_by(fn {_c, strength} -> -strength end)  # Sort by strength
  |> Enum.take(number_of_winners)
  |> Enum.map(&elem(&1, 0))
```
- **Ordered by total path strength** (strongest first)
- Most preferred to least preferred (by path strength)
- Ties: Arbitrary order

**Case 2: Exactly enough or fewer winners**
```elixir
else
  Enum.take(winners, number_of_winners)  # Arbitrary order
```
- **No ordering** - just takes first N winners
- Order depends on how `Enum.filter` processes candidates
- Not preference-ordered

### 5. IRV/STV
**Ordering**: ❌ **Chronological order, not preference-ordered**
```elixir
run_rounds(..., winners ++ new_winners_names, ...)  # Append as found
```
- Winners are added in the order they're **elected** (meet quota)
- Order reflects **when** they won, not **how preferred** they are
- First winner may be less preferred than second winner
- **Not preference-ordered**

**Example:**
- Round 1: Candidate A meets quota → elected first
- Round 2: Candidate B meets quota → elected second
- But B might be more preferred overall than A
- Result: [A, B] even though B is more preferred

### 6. Coombs
**Ordering**: ❌ **Chronological order, not preference-ordered**
```elixir
run_coombs_rounds(..., winners ++ new_winners_names, ...)  # Append as found
```
- Same as IRV/STV: winners added in order they're elected
- Order reflects **when** they won, not **how preferred** they are
- **Not preference-ordered**

## Summary Table

| Algorithm | Ordering Status | Ordering Method | Reliability |
|-----------|----------------|-----------------|-------------|
| **Score** | ✅ Ordered | By score (highest first) | Always |
| **Approval** | ✅ Ordered | By approval count (highest first) | Always |
| **Ranked Pairs** | ⚠️ Conditional | By win count (if not all Condorcet) | Sometimes |
| **Schulze** | ⚠️ Conditional | By path strength (if more than needed) | Sometimes |
| **IRV/STV** | ❌ Not ordered | Chronological (election order) | Never |
| **Coombs** | ❌ Not ordered | Chronological (election order) | Never |

## Issues

### 1. Inconsistent Ordering
- Some methods always order (Score, Approval)
- Some conditionally order (Ranked Pairs, Schulze)
- Some never order (IRV/STV, Coombs)

### 2. Chronological vs Preference Ordering
- IRV/STV and Coombs use **chronological order** (when elected)
- This is **not** preference order
- First winner may be less preferred than later winners

### 3. Arbitrary Order for Ties
- Even when sorted, ties result in arbitrary order
- Depends on stable sort implementation
- May vary between runs

### 4. No Ordering Information Available
- For Ranked Pairs Condorcet winners: no preference metric available
- For Schulze when exactly N winners: no ranking available
- For IRV/STV and Coombs: no preference ordering available

## Recommendations

### Option 1: Document Current Behavior
- Clearly document which methods provide ordering
- Note that IRV/STV and Coombs use chronological order
- Warn users not to interpret order as preference for these methods

### Option 2: Add Post-Processing Ordering
- For IRV/STV and Coombs: sort winners by some metric (e.g., final vote count)
- For Ranked Pairs: always sort by win count, even for Condorcet winners
- For Schulze: always sort by path strength

### Option 3: Return Additional Metadata
- Return winners as list with preference scores
- Allow UI to display with or without ordering
- Provide ordering information separately

### Option 4: Standardize All Methods
- Always sort winners by some preference metric
- Use consistent tie-breaking (e.g., alphabetical)
- Document the ordering method for each algorithm

## Current UI Impact

The frontend displays winners as:
```typescript
{methodResult.winners.join(', ')}
```

This implies no ordering significance, but users might interpret:
- First listed = most preferred
- Last listed = least preferred

**This is incorrect for IRV/STV and Coombs.**

## Recommendation

**Short-term**: Document that IRV/STV and Coombs winners are in chronological order, not preference order.

**Long-term**: Add post-processing to sort all winners by a preference metric:
- IRV/STV: Sort by final vote count when elected
- Coombs: Sort by final vote count when elected
- Ranked Pairs: Always sort by win count
- Schulze: Always sort by path strength

This would provide consistent, meaningful ordering across all methods.

