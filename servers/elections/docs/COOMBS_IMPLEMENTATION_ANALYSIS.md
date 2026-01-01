# Coombs Method Implementation Analysis

## Questions

1. Will the Coombs method produce multiple winners?
2. Is it symmetrical to STV (properly designed for multiple winners)?
3. Is it orthodox single-winner Coombs misapplied to multi-winner?
4. Is it single-winner sequentially applied (like Ranked Pairs extension)?

## Coombs Method - Theoretical Background

### Orthodox Coombs Method (Single Winner)

**Algorithm:**
1. Count first preferences
2. If any candidate has majority, they win
3. Otherwise, eliminate candidate with **most last-place votes** (opposite of IRV)
4. Transfer all votes from eliminated candidate
5. Repeat until someone has majority

**Key Difference from IRV:**
- **IRV**: Eliminates candidate with **fewest first-preference votes**
- **Coombs**: Eliminates candidate with **most last-preference votes**

### Multi-Winner Coombs

There is **no standard multi-winner Coombs method** in voting theory literature. Coombs is fundamentally a single-winner method.

## Current Implementation Analysis

Looking at the code:

```elixir
defp run_coombs(rankings, config, number_of_winners) do
  candidates = get_in(config, ["candidates"]) || []
  candidate_names = Enum.map(candidates, & &1["name"])
  total_votes = length(rankings)
  quota = div(total_votes, number_of_winners + 1) + 1  # Droop quota
  
  run_coombs_rounds(rankings, candidate_names, [], number_of_winners, quota)
end
```

**Key Observations:**
1. Uses **Droop quota** (same as STV): `div(total_votes, number_of_winners + 1) + 1`
2. Continues until `length(winners) >= number_of_winners`
3. Uses quota-based election (STV feature)

```elixir
defp run_coombs_rounds(rankings, remaining, winners, number_of_winners, quota) do
  # Count first preferences
  first_prefs = count_first_preferences(rankings, remaining)
  
  # Check for candidates meeting quota
  {new_winners, still_remaining} =
    Enum.split_with(first_prefs, fn {_candidate, count} -> count >= quota end)
  
  if length(new_winners_names) > 0 do
    # Transfer surplus votes (STV feature)
    updated_rankings = transfer_surplus_votes(rankings, new_winners_names, quota)
    run_coombs_rounds(...)
  else
    # Eliminate candidate with most last-place votes (Coombs feature)
    last_prefs = count_last_preferences(rankings, remaining)
    eliminated = last_prefs |> Enum.max_by(fn {_c, count} -> count end) |> elem(0)
    ...
  end
end
```

## Analysis

### What the Implementation Does

1. **Uses STV quota mechanism**: Droop quota for multiple winners
2. **Elects candidates who meet quota**: Like STV
3. **Transfers surplus votes**: Like STV
4. **Eliminates by last-place votes**: Like Coombs (when no one meets quota)

### Comparison to STV

| Feature | STV | Current Coombs Implementation |
|---------|-----|-------------------------------|
| Quota Calculation | Droop quota | Droop quota ✅ |
| Quota-based Election | Yes | Yes ✅ |
| Surplus Transfers | Yes | Yes ✅ |
| Elimination Method | Fewest first preferences | Most last preferences ⚠️ |
| Multiple Winners | Designed for it | Uses STV structure ✅ |

### Is It Symmetrical to STV?

**Partially, but not fully:**

- ✅ **Quota mechanism**: Same (Droop quota)
- ✅ **Surplus transfers**: Same
- ✅ **Multiple winners support**: Uses STV structure
- ⚠️ **Elimination method**: Different (last-place vs first-place)

**It's STV with Coombs-style elimination** rather than pure Coombs extended to multiple winners.

### Is It Orthodox Single-Winner Coombs Misapplied?

**No**, because:
- Orthodox Coombs doesn't use quota
- Orthodox Coombs doesn't transfer surplus
- Orthodox Coombs just eliminates until majority

The current implementation is **STV with Coombs elimination**, not orthodox Coombs.

### Is It Single-Winner Sequentially Applied?

**No**, because:
- It uses quota-based election (not sequential elimination)
- It transfers surplus votes (STV feature)
- It elects multiple winners simultaneously when they meet quota
- It only uses Coombs elimination when no one meets quota

This is **not** like the Ranked Pairs extension (which runs sequentially).

## Answer to Questions

### 1. Will Coombs produce multiple winners?

**Yes**, it will produce multiple winners when `number_of_winners > 1`. It uses the same STV quota mechanism.

### 2. Is it symmetrical to STV?

**Partially**: 
- Same quota calculation
- Same surplus transfer mechanism
- Same multiple-winner structure
- **Different elimination method** (last-place vs first-place)

It's **STV with Coombs-style elimination** rather than pure Coombs.

### 3. Is it orthodox single-winner Coombs misapplied?

**No**, it's not orthodox Coombs at all. Orthodox Coombs:
- Doesn't use quota
- Doesn't transfer surplus
- Just eliminates until majority

The current implementation is **STV-based with Coombs elimination**.

### 4. Is it single-winner sequentially applied?

**No**, it's not sequential. It:
- Uses quota-based election
- Can elect multiple winners simultaneously
- Only uses Coombs elimination when no one meets quota

## Theoretical Assessment

### What This Implementation Is

**"STV with Coombs Elimination"** - a hybrid method that:
1. Uses STV's quota and surplus transfer mechanisms
2. Uses Coombs' last-place elimination when no one meets quota
3. Supports multiple winners through STV structure

### Is This Valid?

**Theoretically questionable** because:
- There's no standard multi-winner Coombs method
- Combining STV quota with Coombs elimination is non-standard
- The elimination method (last-place) may not work well with quota-based election

**Practically functional** because:
- It will produce results
- Uses proven STV mechanisms for multiple winners
- Coombs elimination only used when needed

### Potential Issues

1. **Inconsistent elimination logic**: 
   - STV eliminates by fewest first preferences
   - This uses most last preferences
   - May produce different results than pure STV

2. **No theoretical foundation**: 
   - This hybrid method isn't studied in voting theory
   - Unknown properties (monotonicity, etc.)

3. **Confusing naming**: 
   - Called "Coombs" but uses STV structure
   - Users might expect orthodox Coombs

## Recommendation

### Option 1: Keep Current Implementation
- **Label**: "Coombs-STV" or "STV with Coombs Elimination"
- **Document**: Explain it's a hybrid method
- **Pros**: Works, supports multiple winners
- **Cons**: Non-standard, confusing name

### Option 2: Implement Orthodox Coombs for Single-Winner Only
- **Label**: "Coombs" (single-winner only)
- **Algorithm**: Eliminate by last-place votes until majority
- **Pros**: Mathematically pure Coombs
- **Cons**: Doesn't support multiple winners

### Option 3: Use STV for Multiple Winners, Coombs for Single
- **Single-winner**: Orthodox Coombs (no quota, just elimination)
- **Multiple-winner**: STV (current STV implementation)
- **Pros**: Both methods are pure
- **Cons**: Different algorithms for different cases

## Conclusion

**Current Implementation:**
- ✅ Will produce multiple winners
- ⚠️ Not symmetrical to STV (different elimination)
- ❌ Not orthodox Coombs (uses STV structure)
- ❌ Not sequential (uses quota-based election)

**It's a hybrid method**: STV's quota and surplus mechanisms with Coombs' last-place elimination, extended to support multiple winners. This is a **non-standard approach** that works but lacks theoretical foundation.

