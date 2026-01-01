# Ambiguous Ordering vs Indeterminate Results

## The Question

If we use metrics to determine statistical ties (treating identical metrics as statistical ties), can we still have ambiguous cases when we have a **full set of winners**? Or is "ambiguous" only for **indeterminate results** (e.g., need 3 winners but only determined 2)?

## Two Different Concepts

### 1. Ambiguous Ordering (Within a Set of Winners)
**Definition**: We have a full set of winners, but cannot determine their relative order.

**Example**:
- Need 3 winners
- We have 3 winners: Alice, Bob, Charlie
- All have identical metrics (path strength 45)
- They're all winners, but order is unknown

**Question**: Is this ambiguous ordering, or just statistical ties?

### 2. Indeterminate Results (Incomplete Set of Winners)
**Definition**: We cannot determine a full set of winners.

**Example**:
- Need 3 winners
- We can only determine 2: Alice, Bob
- The third winner is indeterminate
- Algorithm status: "inconclusive"

**Question**: Is this what "ambiguous" should refer to?

## Current Implementation Analysis

### Algorithm Status Values

All algorithms return:
```elixir
status: if(length(winners) >= number_of_winners, do: "conclusive", else: "inconclusive")
```

**"conclusive"**: We have enough winners (full set or more)
**"inconclusive"**: We don't have enough winners (indeterminate)

### Cases

#### Case 1: Full Set of Winners, All Statistically Tied
- Need 3 winners
- Have 3 winners: Alice, Bob, Charlie
- All have same metric (e.g., path strength 45)
- Status: "conclusive"
- **Ordering**: Statistically tied (all 1st, or all tied for positions)

**Is this ambiguous?**
- **No** - we have a full set of winners
- They're statistically tied
- Order doesn't matter - they're all winners
- This is a **statistical tie**, not ambiguous

#### Case 2: Partial Set of Winners
- Need 3 winners
- Have 2 winners: Alice, Bob
- Cannot determine 3rd winner
- Status: "inconclusive"
- **Result**: Indeterminate

**Is this ambiguous?**
- **Yes** - but this is about **indeterminate results**, not ordering
- We don't have enough winners
- This is what "inconclusive" status indicates

#### Case 3: Full Set of Winners, No Ordering Information
- Need 3 winners
- Have 3 winners: Alice, Bob, Charlie
- Algorithm doesn't provide ordering metrics (e.g., current IRV/STV)
- Status: "conclusive"
- **Ordering**: Unknown (chronological only)

**Is this ambiguous?**
- **Yes** - this is **ambiguous ordering**
- We have winners, but cannot determine preference order
- This is different from indeterminate results

## The Distinction

### Statistical Tie (Full Set, Same Metrics)
- **We have**: Full set of winners
- **We know**: They're equal (same metric)
- **Ordering**: Doesn't matter - they're tied
- **Status**: "conclusive"
- **Display**: "Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>" (all tied)

### Ambiguous Ordering (Full Set, No Ordering Info)
- **We have**: Full set of winners
- **We don't know**: Their relative order
- **Ordering**: Unknown/arbitrary
- **Status**: "conclusive"
- **Display**: "(Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>3rd</sup>)" (order unknown)

### Indeterminate Results (Incomplete Set)
- **We have**: Partial set of winners
- **We don't know**: Who the remaining winners are
- **Ordering**: N/A (incomplete set)
- **Status**: "inconclusive"
- **Display**: "Alice, Bob (3rd winner indeterminate)"

## Answer to the Question

### Can We Have Ambiguous Ordering with Full Set of Winners?

**Yes**, but only when:
1. **No ordering information available**: Algorithm doesn't provide metrics
   - Example: Current IRV/STV (chronological only, no vote counts)
   - Example: Algorithm error (no metrics calculated)

2. **Ordering information is incomplete**: We have some metrics but not enough
   - Example: Partial algorithm results
   - Example: Incomplete data

**No**, when:
1. **We have metrics and they're identical**: This is a statistical tie
   - Example: All winners have path strength 45
   - They're tied, not ambiguous

### Is Ambiguous Only for Indeterminate Results?

**No**, ambiguous can refer to:
1. **Indeterminate results**: Incomplete set of winners (status: "inconclusive")
2. **Ambiguous ordering**: Full set of winners, but order unknown (status: "conclusive")

These are **different concepts**:
- **Indeterminate**: We don't have enough winners
- **Ambiguous ordering**: We have winners, but don't know their order

## Revised Classification

### Statistical Tie
- **Full set of winners**: ✅
- **Same metric values**: ✅
- **Order doesn't matter**: They're equal
- **Status**: "conclusive"
- **Example**: All have path strength 45

### Ambiguous Ordering
- **Full set of winners**: ✅
- **No ordering information**: ✅
- **Order is unknown**: ✅
- **Status**: "conclusive"
- **Example**: Current IRV/STV (chronological, no vote counts)

### Indeterminate Results
- **Partial set of winners**: ✅
- **Cannot determine remaining winners**: ✅
- **Status**: "inconclusive"
- **Example**: Need 3, only found 2

## Display Examples

### Statistical Tie (Full Set)
"Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>"
- All three are winners
- All statistically tied
- Order doesn't matter

### Ambiguous Ordering (Full Set, No Info)
"(Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>3rd</sup>)"
- All three are winners
- Order is unknown (no metrics available)
- Parentheses indicate ambiguity

### Indeterminate Results (Partial Set)
"Alice, Bob (3rd winner indeterminate)"
- Only 2 winners found
- 3rd winner cannot be determined
- Status: "inconclusive"

### Mixed: Some Tied, Some Ambiguous
"Alice<sup>1st</sup>, Bob<sup>1st</sup>, (Charlie<sup>3rd</sup>, David<sup>3rd</sup>)"
- Alice and Bob: Statistically tied for 1st
- Charlie and David: Ambiguously tied for 3rd (no ordering info)

## Conclusion

### Can We Have Ambiguous Ordering with Full Set?

**Yes**, when:
- We have a full set of winners (status: "conclusive")
- But no ordering information is available
- Order is unknown/arbitrary

**No**, when:
- We have ordering information (metrics)
- Even if metrics are identical (that's a statistical tie)

### Is Ambiguous Only for Indeterminate Results?

**No**, ambiguous can refer to:
1. **Indeterminate results**: Incomplete set (status: "inconclusive")
2. **Ambiguous ordering**: Full set, unknown order (status: "conclusive")

### The Key Distinction

- **Statistical tie**: We know they're equal (have metrics, values are same)
- **Ambiguous ordering**: We don't know the order (no metrics or incomplete)
- **Indeterminate results**: We don't have enough winners (incomplete set)

All three are different concepts that can coexist:
- A full set of winners can be statistically tied
- A full set of winners can have ambiguous ordering
- A partial set of winners is indeterminate

