# IRV vs STV Failure Analysis for Single-Winner Elections

## Question
Can STV algorithm fail where IRV would succeed in single-winner elections? Can IRV fail where STV would succeed?

**Clarification**: By "failure" we mean:
1. **Producing a different result** (electing different winner)
2. **Failing to produce any result** (error, exception, infinite loop) where the other would succeed

## Theoretical Analysis

### True IRV Algorithm (Single Winner)
1. Count first preferences
2. If any candidate has majority (50% + 1), they win
3. Otherwise, eliminate candidate with fewest votes
4. Transfer all votes from eliminated candidate to next preference
5. Repeat until someone has majority

### STV Algorithm (Applied to Single Winner)
1. Calculate quota: `(total_votes / 2) + 1` (Droop quota for N=1)
2. Count first preferences
3. If any candidate meets quota, elect them
4. If candidate exceeds quota, transfer surplus proportionally
5. If no one meets quota, eliminate lowest candidate
6. Transfer all votes from eliminated candidate
7. Repeat until someone meets quota

## Key Differences

### 1. Surplus Transfer
- **IRV**: No surplus concept - just elimination
- **STV**: If candidate exceeds quota, transfers surplus votes

**Potential Issue**: In single-winner STV, if a candidate gets more than quota, surplus is transferred. This could theoretically affect the outcome if:
- Surplus transfer is done incorrectly
- Surplus transfer creates empty rankings
- Surplus transfer changes elimination order

**In Practice**: For single-winner, if someone exceeds quota, they've already won (have majority), so surplus transfer shouldn't matter. But implementation could have bugs.

### 2. Quota Calculation Edge Cases

**IRV**: No quota - just checks for majority
**STV**: Calculates quota = `div(total_votes, 2) + 1`

**Potential Issues**:
- Integer division rounding
- Edge case: What if `total_votes` is odd? `div(5, 2) + 1 = 2 + 1 = 3` (correct majority)
- Edge case: What if `total_votes` is even? `div(4, 2) + 1 = 2 + 1 = 3` (correct, > 50%)

**Analysis**: Quota calculation appears correct for single-winner.

### 3. Empty Rankings After Transfers

**IRV**: When candidate eliminated, votes transferred to next preference. If no next preference, vote is exhausted.

**STV**: Same, but also handles surplus transfers which could create empty rankings.

**Potential Issue**: If STV's surplus transfer creates more empty rankings than IRV's simple elimination, it could affect the outcome.

### 4. Implementation Differences

Looking at the current implementation:

```elixir
defp transfer_surplus_votes(rankings, winners, quota) do
  Enum.reduce(winners, rankings, fn winner, acc_rankings ->
    winner_votes = Enum.count(acc_rankings, fn r -> List.first(r) == winner end)
    surplus = winner_votes - quota

    if surplus > 0 do
      {winner_rankings, other_rankings} =
        Enum.split_with(acc_rankings, fn r -> List.first(r) == winner end)

      transfer_count = min(surplus, length(winner_rankings))
      {to_transfer, to_keep} = Enum.split(winner_rankings, transfer_count)

      transferred = Enum.map(to_transfer, fn r -> List.delete(r, winner) end)
      kept = Enum.map(to_keep, fn r -> List.delete(r, winner) end)

      other_rankings ++ transferred ++ kept
    else
      acc_rankings
    end
  end)
end
```

**Potential Issues**:
1. **Surplus transfer for single winner**: If winner exceeds quota, surplus is transferred. But in single-winner, if someone exceeds quota, they've won - why transfer?
2. **Transfer count**: `transfer_count = min(surplus, length(winner_rankings))` - transfers up to surplus votes
3. **Empty rankings**: `List.delete(r, winner)` could create empty lists if winner was only candidate

## Failure Scenarios

### Scenario 1: Surplus Transfer Creates Empty Rankings

**Setup**:
- 3 candidates: A, B, C
- 5 votes: [A, B], [A, C], [A], [B, C], [B]
- A gets 3 votes (quota = 3, so A meets quota exactly)
- Wait, quota = `div(5, 2) + 1 = 3`, so A has exactly quota, no surplus

**Better Example**:
- 5 votes: [A, B], [A, B], [A, C], [B, C], [B]
- A gets 3 votes, quota = 3
- A meets quota exactly, no surplus to transfer
- A wins

**With Surplus**:
- 5 votes: [A, B], [A, B], [A, B], [B, C], [C]
- A gets 3 votes, quota = 3
- A has exactly quota, no surplus

Actually, for single-winner, if quota = majority, and someone exceeds quota, they have more than majority, so they've won. Surplus transfer shouldn't affect the outcome.

### Scenario 2: Integer Division Edge Case

**Example**:
- 3 votes total
- Quota = `div(3, 2) + 1 = 1 + 1 = 2`
- Candidate A gets 2 votes
- A meets quota, wins

**IRV**:
- A gets 2 votes (majority of 3)
- A wins

Same result.

### Scenario 3: Ties in Elimination

**IRV**: Eliminates candidate with fewest votes. If tie, needs tie-breaking.

**STV**: Same - eliminates lowest. If tie, needs tie-breaking.

**Potential Difference**: If tie-breaking is different, could get different results. But this is implementation-dependent, not algorithm-dependent.

### Scenario 4: Exhausted Votes

**IRV**: If vote has no more preferences after elimination, vote is exhausted.

**STV**: Same, but also after surplus transfers.

**Potential Issue**: If STV's surplus transfer causes more votes to be exhausted than IRV's simple elimination, could affect outcome.

**Example**:
- Vote: [A, B] where A is winner
- STV transfers surplus: removes A, vote becomes [B]
- If B is eliminated, vote becomes [] (exhausted)
- IRV: A wins, no transfer needed, vote stays [A, B]

But wait - if A wins in STV, we're done. Surplus transfer only happens if we need to continue. For single-winner, if A exceeds quota, A wins - no need to continue.

## Conclusion

### Can STV Fail Where IRV Would Succeed?

**Theoretically: No**, because:
1. For single-winner, STV with quota = majority is mathematically equivalent to IRV
2. If candidate exceeds quota, they've won (have majority)
3. Surplus transfer shouldn't affect single-winner outcome
4. Both eliminate lowest candidate when no majority

**Practically: Possibly**, due to:
1. **Implementation bugs**: Surplus transfer logic could have bugs
2. **Edge cases**: Empty rankings, exhausted votes handled differently
3. **Tie-breaking**: Different tie-breaking could lead to different results
4. **Integer arithmetic**: Rounding issues (though quota calculation looks correct)

### Can IRV Fail Where STV Would Succeed?

**Theoretically: No**, because:
1. IRV is simpler - just elimination until majority
2. STV adds complexity (quota, surplus) that shouldn't help for single-winner
3. Both should produce same result for single-winner

**Practically: Possibly**, due to:
1. **Implementation bugs**: IRV implementation could have bugs
2. **Edge cases**: Different handling of exhausted votes
3. **Tie-breaking**: Different tie-breaking

## Current Implementation Analysis

Looking at the code, for single-winner:
1. Quota = `div(total_votes, 2) + 1` (correct majority)
2. If candidate meets quota, they're elected
3. If candidate exceeds quota, surplus is transferred (unnecessary for single-winner, but shouldn't hurt)
4. If no one meets quota, lowest is eliminated (same as IRV)

**Potential Issue**: The surplus transfer for single-winner is unnecessary complexity. If someone exceeds quota (has majority), they've won - no need to transfer surplus. But the current implementation does transfer it, which could theoretically cause issues if:
- Surplus transfer creates bugs
- Surplus transfer affects vote counts incorrectly
- Surplus transfer creates empty rankings that affect later rounds

## Recommendation

### For Single-Winner Elections:

**Option 1: Use True IRV**
- Simpler algorithm
- No quota calculation needed
- No surplus transfers
- Mathematically equivalent to STV for single-winner
- Less code complexity

**Option 2: Optimize STV for Single-Winner**
- Skip surplus transfer if `number_of_winners == 1` and candidate exceeds quota
- Just declare winner immediately
- Keep quota calculation (it's correct)

**Option 3: Keep Current Implementation**
- Works correctly in practice
- Surplus transfer for single-winner is harmless (winner already determined)
- Simpler codebase (one algorithm for both)

## Answer to the Question

**Can STV fail where IRV would succeed?**
- **Theoretically: No** - they're equivalent for single-winner
- **Practically: Possibly** - due to implementation complexity (surplus transfers) that could introduce bugs

**Can IRV fail where STV would succeed?**
- **Theoretically: No** - IRV is simpler, STV adds unnecessary complexity for single-winner
- **Practically: Possibly** - due to implementation bugs in either

**Recommendation**: For single-winner, true IRV would be simpler and less error-prone, but current STV implementation should work correctly if implemented properly.

