# IRV vs STV Implementation Analysis

## Current Implementation

### What the Code Does

The `IRVSTV` module uses **the same algorithm** for both single-winner and multiple-winner scenarios:

1. **Quota Calculation** (line 39):
   ```elixir
   quota = div(total_votes, number_of_winners + 1) + 1
   ```
   - This is the **Droop quota** formula, used in STV
   - For single winner: `quota = div(total_votes, 2) + 1` (majority)
   - For multiple winners: `quota = div(total_votes, number_of_winners + 1) + 1`

2. **Method Labeling** (line 11):
   ```elixir
   method: if(Map.get(ballot, "number_of_winners", 1) == 1, do: "irv", else: "stv")
   ```
   - Labels the result as "irv" for single-winner, "stv" for multiple-winner
   - **But the algorithm is the same in both cases**

3. **Algorithm Behavior**:
   - Uses quota-based election (STV feature)
   - Transfers surplus votes when candidates exceed quota (STV feature)
   - Eliminates lowest candidates when no one meets quota
   - Continues until N winners are found

## The Answer: **Not Exactly**

### What's Actually Happening:

**The algorithm is always STV-based**, regardless of `number_of_winners`:

- ✅ **For multiple winners**: Correctly implements STV with Droop quota
- ⚠️ **For single winner**: Uses STV mechanics but is labeled as "IRV"

### True IRV vs STV

**True IRV (Instant Runoff Voting)** for single winner:
- Eliminates candidate with fewest first-preference votes
- Transfers all votes from eliminated candidate
- Continues until one candidate has a **majority** (50% + 1)
- **No quota calculation needed** - just elimination rounds

**STV (Single Transferable Vote)** for multiple winners:
- Uses **Droop quota**: `(total_votes / (number_of_winners + 1)) + 1`
- Elects candidates who meet quota
- Transfers **surplus votes** (votes above quota) proportionally
- Eliminates lowest candidates when no one meets quota
- Continues until N winners are found

### Current Implementation Behavior

When `number_of_winners == 1`:
- Quota = `div(total_votes, 2) + 1` (majority)
- Algorithm elects candidate if they meet quota
- Transfers surplus if candidate exceeds quota
- Eliminates if no one meets quota

**This is STV with quota = majority**, not pure IRV.

## Differences

| Aspect | True IRV | Current Implementation (labeled "irv") | STV |
|--------|----------|----------------------------------------|-----|
| Quota Calculation | None (just majority check) | Droop quota with N=1 | Droop quota |
| Surplus Transfers | All votes transferred | Surplus votes transferred | Surplus votes transferred |
| Election Mechanism | Elimination until majority | Quota-based election | Quota-based election |
| Multiple Winners | N/A | Supported | Supported |

## Is This a Problem?

### For Single Winner:
- **Functionally similar**: Both elect candidate with majority support
- **Minor difference**: True IRV eliminates until majority; STV elects when quota met
- **Practical impact**: Usually produces same result, but STV can be slightly more efficient

### For Multiple Winners:
- ✅ **Correctly implements STV**
- ✅ Uses proper Droop quota
- ✅ Handles surplus transfers
- ✅ Supports proportional representation

## Recommendation

### Option 1: Keep Current Implementation (Pragmatic)
- **Pros**: Works correctly, simpler codebase, STV subsumes IRV
- **Cons**: Technically not "pure" IRV for single winner
- **Labeling**: Could change label to "STV" for both, or "IRV/STV" to indicate they're related

### Option 2: Implement True IRV for Single Winner
- **Pros**: Mathematically pure IRV
- **Cons**: More code complexity, two separate algorithms
- **Implementation**: Would need separate `run_irv` function that eliminates until majority without quota

### Option 3: Clarify Documentation
- Document that "IRV" label uses STV mechanics
- Explain that STV with quota=majority is equivalent to IRV for practical purposes
- Note that this is a common implementation approach

## Conclusion

**Answer to the question**: 

> "Is it true that IRV algorithm is applied for single winner and STV algorithm for multiple winners?"

**No, not exactly.** The same STV-based algorithm is used for both, but:
- It's **labeled** as "IRV" for single winner and "STV" for multiple winners
- The algorithm uses STV mechanics (quota, surplus transfers) in both cases
- For single winner, the quota equals majority, making it functionally similar to IRV
- For multiple winners, it correctly implements STV

The implementation is **correct and functional**, but the labeling is slightly misleading - it's always STV, just with different quota calculations based on number of winners.

