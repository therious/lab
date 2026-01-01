# Plan: Implementing Proper Multiple Winners for Condorcet Methods

## Executive Summary

This document presents a plan to implement proper multiple-winner support for Ranked Pairs and Schulze methods. It compares two approaches:
1. **Extension Approach**: Extend existing popular methods (Ranked Pairs, Schulze) to handle multiple winners
2. **Alternative Method Approach**: Switch to methods specifically designed for multiple winners (Chamberlin-Courant, Monroe)

## Current State

### Ranked Pairs (Tideman)
- **Current Implementation**: Simple extension that takes top N Condorcet winners or top N by win counts
- **Issue**: Not a formal multi-winner method; may not satisfy Condorcet criteria for all winners

### Schulze
- **Current Implementation**: Simple extension that takes top N by strongest path strength
- **Issue**: Not a formal multi-winner method; may not satisfy Schulze criteria for all winners

## Option 1: Extend Existing Methods

### Ranked Pairs Extension

#### Approach A: Sequential Ranked Pairs
1. Run Ranked Pairs to find first winner
2. Remove winner from candidate set
3. Re-run Ranked Pairs on remaining candidates
4. Repeat until N winners found

**Pros:**
- Maintains familiarity with Ranked Pairs
- Preserves Condorcet winner property for first winner
- Relatively simple to implement
- Easy to explain to users

**Cons:**
- May not find optimal set of winners
- Later winners may not satisfy Condorcet criteria
- Sequential elimination can lead to suboptimal results
- Computational cost: O(N × complexity of Ranked Pairs)

#### Approach B: Multi-Winner Ranked Pairs (Proportional)
1. Build pairwise comparison matrix (same as single-winner)
2. Instead of locking all pairs, lock pairs that create a proportional representation
3. Select winners that maximize Condorcet satisfaction across the set

**Pros:**
- More theoretically sound
- Considers all winners together
- Better proportional representation

**Cons:**
- More complex to implement
- Less intuitive than sequential approach
- Requires defining "proportional Condorcet satisfaction"

### Schulze Extension

#### Approach A: Sequential Schulze
1. Run Schulze to find first winner
2. Remove winner from candidate set
3. Re-run Schulze on remaining candidates
4. Repeat until N winners found

**Pros:**
- Maintains familiarity with Schulze
- Preserves Schulze winner property for first winner
- Relatively simple to implement

**Cons:**
- Same issues as sequential Ranked Pairs
- Later winners may not satisfy Schulze criteria
- Sequential elimination can lead to suboptimal results

#### Approach B: Multi-Winner Schulze (Proportional)
1. Compute strongest paths for all candidates
2. Select set of N winners that maximizes overall path strength
3. Ensure proportional representation

**Pros:**
- More theoretically sound
- Considers all winners together

**Cons:**
- More complex to implement
- Less intuitive

## Option 2: Switch to Methods Designed for Multiple Winners

### Chamberlin-Courant Method

**Description**: Selects a committee of N winners such that the sum of each voter's satisfaction (based on their highest-ranked winner) is maximized.

**Algorithm:**
1. For each possible committee of size N:
   - Calculate satisfaction: sum of each voter's highest-ranked candidate in the committee
2. Select committee with maximum satisfaction

**Pros:**
- Specifically designed for multiple winners
- Theoretically well-founded
- Maximizes voter satisfaction
- Proportional representation

**Cons:**
- Computationally expensive (exponential in worst case)
- Requires optimization techniques for large candidate sets
- Less familiar to users than Ranked Pairs/Schulze
- Different name may confuse users expecting "Ranked Pairs"

**Implementation:**
- Use dynamic programming for small N
- Use approximation algorithms (greedy) for large N
- Or use integer linear programming

### Monroe Method

**Description**: Similar to Chamberlin-Courant but ensures each winner represents approximately the same number of voters.

**Algorithm:**
1. Partition voters into N groups (approximately equal size)
2. For each partition, find the candidate that maximizes satisfaction for that group
3. Select the partition that maximizes overall satisfaction

**Pros:**
- Specifically designed for multiple winners
- Ensures proportional representation
- Each winner represents roughly equal number of voters
- Theoretically well-founded

**Cons:**
- Computationally expensive
- More complex than Chamberlin-Courant
- Less familiar to users
- Different name may confuse users

**Implementation:**
- Use approximation algorithms (greedy or local search)
- Or use integer linear programming

### Phragmen's Sequential Method

**Description**: A proportional method that elects winners sequentially, distributing "voting power" proportionally.

**Algorithm:**
1. Elect first candidate with most first preferences
2. Distribute voting power from voters who supported winner
3. Elect next candidate with most weighted support
4. Repeat until N winners

**Pros:**
- Specifically designed for multiple winners
- Proportional representation
- Sequential (easier to understand)
- Computationally efficient

**Cons:**
- Less familiar than Ranked Pairs/Schulze
- Different name

## Comparison Matrix

| Method | Familiarity | Theoretical Soundness | Computational Cost | Proportionality | Implementation Complexity |
|--------|-------------|----------------------|---------------------|-----------------|--------------------------|
| Sequential Ranked Pairs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Multi-Winner Ranked Pairs | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Sequential Schulze | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Multi-Winner Schulze | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| Chamberlin-Courant | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Monroe | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Phragmen Sequential | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## Recommendation

### Phase 1: Short-term (Pragmatic Extension)
**Implement Sequential Ranked Pairs and Sequential Schulze**

**Rationale:**
- Maintains user familiarity with method names
- Relatively simple to implement
- Preserves Condorcet/Schulze properties for first winner
- Good enough for most use cases
- Can be implemented quickly

**Implementation Steps:**
1. Create `RankedPairsMultiWinner` module
2. Implement sequential elimination:
   - Run Ranked Pairs
   - Remove winner
   - Re-run on remaining candidates
   - Repeat until N winners
3. Same for Schulze
4. Add tests for multiple winners scenarios
5. Update UI to show "Ranked Pairs (Multi-Winner)" or similar

### Phase 2: Long-term (Theoretically Sound)
**Add Chamberlin-Courant as an additional method**

**Rationale:**
- Provides a theoretically sound multi-winner Condorcet method
- Users can choose between familiar (Ranked Pairs) and optimal (Chamberlin-Courant)
- Can be implemented alongside, not replacing, existing methods
- Good for elections where optimal proportional representation is critical

**Implementation Steps:**
1. Research efficient algorithms (greedy approximation or ILP)
2. Implement `ChamberlinCourant` module
3. Use greedy algorithm for large candidate sets
4. Add to algorithm list as "Chamberlin-Courant (Multi-Winner Condorcet)"
5. Document when to use vs Ranked Pairs

## Implementation Plan

### Phase 1: Sequential Extensions

#### Ranked Pairs Multi-Winner

```elixir
defmodule Elections.Algorithms.RankedPairsMultiWinner do
  def calculate(ballot, votes, number_of_winners) do
    candidates = get_in(ballot, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])
    
    select_winners_sequentially(ballot, votes, candidate_names, [], number_of_winners)
  end
  
  defp select_winners_sequentially(_ballot, _votes, _remaining, winners, number_of_winners) 
    when length(winners) >= number_of_winners do
    winners
  end
  
  defp select_winners_sequentially(ballot, votes, remaining, winners, number_of_winners) do
    # Run single-winner Ranked Pairs on remaining candidates
    winner = Elections.Algorithms.RankedPairs.calculate_single_winner(ballot, votes, remaining)
    
    # Add winner and recurse
    select_winners_sequentially(
      ballot, 
      votes, 
      List.delete(remaining, winner),
      winners ++ [winner],
      number_of_winners
    )
  end
end
```

**Required Changes:**
- Extract single-winner logic from `RankedPairs.calculate`
- Create `calculate_single_winner/3` helper
- Implement sequential wrapper

#### Schulze Multi-Winner

Similar structure to Ranked Pairs:
- Extract single-winner logic
- Create sequential wrapper
- Re-run on remaining candidates

### Phase 2: Chamberlin-Courant

#### Greedy Approximation Algorithm

```elixir
defmodule Elections.Algorithms.ChamberlinCourant do
  def calculate(ballot, votes, number_of_winners) do
    rankings = extract_rankings(votes, ballot)
    candidates = get_in(ballot, ["candidates"]) || []
    candidate_names = Enum.map(candidates, & &1["name"])
    
    # Greedy algorithm: iteratively add candidate that increases satisfaction most
    select_greedy(rankings, candidate_names, [], number_of_winners)
  end
  
  defp select_greedy(_rankings, _remaining, winners, number_of_winners) 
    when length(winners) >= number_of_winners do
    winners
  end
  
  defp select_greedy(rankings, remaining, winners, number_of_winners) do
    # Calculate satisfaction for each remaining candidate
    candidate_satisfaction = 
      Enum.map(remaining, fn candidate ->
        satisfaction = calculate_satisfaction(rankings, winners ++ [candidate])
        {candidate, satisfaction}
      end)
    
    # Select candidate with highest satisfaction increase
    {best_candidate, _satisfaction} = Enum.max_by(candidate_satisfaction, &elem(&1, 1))
    
    select_greedy(
      rankings,
      List.delete(remaining, best_candidate),
      winners ++ [best_candidate],
      number_of_winners
    )
  end
  
  defp calculate_satisfaction(rankings, committee) do
    Enum.sum(Enum.map(rankings, fn ranking ->
      # Find highest-ranked candidate in committee
      highest_rank = 
        Enum.find_index(ranking, fn candidate -> candidate in committee end)
      
      # Satisfaction is inverse of rank (lower rank = higher satisfaction)
      if highest_rank, do: length(ranking) - highest_rank, else: 0
    end))
  end
end
```

**Optimization Options:**
- Use dynamic programming for small N (≤ 5)
- Use integer linear programming for medium N (6-10)
- Use greedy for large N (> 10)

## Testing Strategy

### Test Cases Needed:
1. **Basic Multiple Winners**
   - 3 candidates, 2 winners
   - 5 candidates, 3 winners
   - Verify correct number of winners returned

2. **Condorcet Properties**
   - Test that first winner is Condorcet winner (if exists)
   - Test that sequential method preserves properties

3. **Edge Cases**
   - More winners requested than candidates
   - All candidates are Condorcet winners
   - Ties in pairwise comparisons

4. **Comparison Tests**
   - Compare sequential Ranked Pairs vs Chamberlin-Courant
   - Verify both produce valid results
   - Document when results differ

## UI/UX Considerations

### Method Naming:
- **Option A**: "Ranked Pairs (Multi-Winner)" - indicates extension
- **Option B**: "Ranked Pairs" - same name, context determines behavior
- **Option C**: "Sequential Ranked Pairs" - explicit about method

**Recommendation**: Option A for clarity, with tooltip explaining the extension

### Display:
- Show all winners in results
- Indicate if method is extension vs designed method
- Provide link to documentation explaining differences

## Documentation Requirements

1. **User-Facing Documentation**
   - Explain difference between single-winner and multi-winner methods
   - When to use sequential extensions vs Chamberlin-Courant
   - Examples showing how methods differ

2. **Technical Documentation**
   - Algorithm descriptions
   - Computational complexity
   - Limitations and edge cases

## Timeline Estimate

### Phase 1 (Sequential Extensions):
- **Ranked Pairs**: 2-3 days
- **Schulze**: 2-3 days
- **Testing**: 2 days
- **Total**: ~1 week

### Phase 2 (Chamberlin-Courant):
- **Research & Design**: 2-3 days
- **Implementation**: 3-4 days
- **Testing**: 2 days
- **Documentation**: 2 days
- **Total**: ~2 weeks

## Success Criteria

1. ✅ All methods return correct number of winners
2. ✅ Sequential methods preserve Condorcet/Schulze properties for first winner
3. ✅ Chamberlin-Courant produces optimal or near-optimal results
4. ✅ Performance acceptable for typical election sizes (< 100 candidates, < 10 winners)
5. ✅ Documentation explains trade-offs clearly
6. ✅ Users can choose appropriate method for their needs

## Conclusion

**Recommended Approach**: Implement Phase 1 (sequential extensions) first for immediate improvement, then Phase 2 (Chamberlin-Courant) for optimal results. This provides:
- Quick wins with familiar methods
- Long-term theoretical soundness
- User choice between pragmatic and optimal approaches

The sequential extensions are "good enough" for most use cases and maintain user familiarity, while Chamberlin-Courant provides the theoretically optimal solution for users who need it.

