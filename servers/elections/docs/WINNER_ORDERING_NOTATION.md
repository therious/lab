# Winner Ordering Notation Specification

## Notation Rules

### 1. Superscripts for Ordinal Positions
- Use superscript (smaller font) for ordinal positions: 1st, 2nd, 3rd, 4th, etc.
- Example: "Alice<sup>1st</sup>"

### 2. Statistical Ties
- When candidates have the same metric value (score, approval count, etc.)
- Both get the same position superscript
- Next position is skipped
- **No parentheses** - these are clear statistical ties

**Example**: "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
- Alice is 1st
- Bob and Charlie are tied for 2nd (same metric value)
- David is 4th (no 3rd because Bob and Charlie both occupy 2nd)

### 3. Ambiguous Ordering
- When order cannot be determined (not just tied, but truly unknown)
- **Prefix the ambiguous group with parentheses**
- Each candidate in the group still gets a superscript
- **No closing parenthesis at the end** - just prefix the group

**Example**: "(Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>), David<sup>4th</sup>"
- Alice, Bob, and Charlie are ambiguously tied for 1st (order unknown)
- David is clearly 4th

**Another example**: "Alice<sup>1st</sup>, (Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>), David<sup>4th</sup>"
- Alice is clearly 1st
- Bob and Charlie are ambiguously tied for 2nd (order unknown)
- David is clearly 4th

## Algorithm-by-Algorithm Analysis

### 1. Score Voting
**Can have ambiguous ordering?** ❌ **No**

**Reasoning**:
- Always has exact scores for all candidates
- Can have **statistical ties** (same score)
- But scores are always known, so ordering is never ambiguous

**Example Output**:
- "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
  - Bob and Charlie both have score 4.2 (statistical tie)
  - No ambiguity - we know their scores are equal

### 2. Approval Voting
**Can have ambiguous ordering?** ❌ **No**

**Reasoning**:
- Always has exact approval counts for all candidates
- Can have **statistical ties** (same approval count)
- But counts are always known, so ordering is never ambiguous

**Example Output**:
- "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
  - Bob and Charlie both have 72 approvals (statistical tie)
  - No ambiguity - we know their counts are equal

### 3. Ranked Pairs
**Can have ambiguous ordering?** ✅ **Yes, in specific cases**

**Cases where ambiguous**:
1. **All Condorcet winners with identical pairwise records**
   - All beat all others equally
   - No win count differentiation
   - No pairwise strength differentiation
   - Order is truly ambiguous

2. **Multiple Condorcet winners with no tiebreaker available**
   - If we can't calculate win counts or pairwise strengths
   - Order cannot be determined

**Cases where statistical tie**:
- When using win counts as tiebreaker
- Multiple candidates with same win count
- This is a statistical tie (we know they're equal)

**Example Outputs**:

**Statistical tie**:
- "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
  - Bob and Charlie both have 4 wins (statistical tie)

**Ambiguous**:
- "(Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>)"
  - All three are Condorcet winners with identical pairwise records
  - Cannot determine order

### 4. Schulze
**Can have ambiguous ordering?** ✅ **Yes, in specific cases**

**Cases where ambiguous**:
1. **All winners have identical total path strengths**
   - Cannot differentiate between them
   - Order is truly ambiguous

2. **Multiple winners with no path strength differentiation**
   - If path strengths are exactly equal
   - Order cannot be determined

**Cases where statistical tie**:
- When path strengths are calculated and some are equal
- This is a statistical tie (we know they're equal)

**Example Outputs**:

**Statistical tie**:
- "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
  - Bob and Charlie both have path strength 42 (statistical tie)

**Ambiguous**:
- "(Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>)"
  - All three have identical path strengths
  - Cannot determine order

### 5. IRV/STV
**Can have ambiguous ordering?** ✅ **Yes, in specific cases**

**Cases where ambiguous**:
1. **Multiple candidates elected in same round with same vote count**
   - If quota is low and multiple candidates meet it simultaneously
   - All have same vote count at election time
   - Order of election is arbitrary
   - Order is ambiguous

2. **Winners elected with no vote count tracking**
   - If we can't track vote counts (current implementation issue)
   - Order is chronological, not preference-based
   - This is ambiguous ordering

**Cases where statistical tie**:
- When vote counts are tracked and some are equal
- This is a statistical tie (we know their vote counts are equal)

**Example Outputs**:

**Statistical tie** (after tracking vote counts):
- "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
  - Bob and Charlie both elected with 38 votes (statistical tie)

**Ambiguous**:
- "(Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>)"
  - All three elected in same round with same vote count
  - Cannot determine preference order

**Current implementation** (before tracking):
- "Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>3rd</sup>"
  - This is chronological, not preference-ordered
  - Should be marked as ambiguous: "(Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>3rd</sup>)"
  - Or better: track vote counts to determine if it's truly ambiguous

### 6. Coombs
**Can have ambiguous ordering?** ✅ **Yes, same as IRV/STV**

**Cases where ambiguous**:
- Same as IRV/STV:
  1. Multiple candidates elected in same round with same vote count
  2. Winners elected with no vote count tracking (current implementation)

**Example Outputs**:
- Same patterns as IRV/STV

## Summary Table

| Algorithm | Statistical Ties | Ambiguous Ordering | When Ambiguous |
|-----------|------------------|-------------------|----------------|
| **Score** | ✅ Yes | ❌ No | Never - always has scores |
| **Approval** | ✅ Yes | ❌ No | Never - always has counts |
| **Ranked Pairs** | ✅ Yes | ✅ Yes | All Condorcet winners with identical records |
| **Schulze** | ✅ Yes | ✅ Yes | All winners with identical path strengths |
| **IRV/STV** | ✅ Yes* | ✅ Yes | Same round, same vote count; or no tracking |
| **Coombs** | ✅ Yes* | ✅ Yes | Same round, same vote count; or no tracking |

*After implementing vote count tracking

## Display Examples

### Example 1: Clear ordering with statistical tie
"Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, David<sup>4th</sup>"
- Alice: 1st place
- Bob and Charlie: Tied for 2nd (statistical tie - same metric)
- David: 4th place

### Example 2: Ambiguous group at start
"(Alice<sup>1st</sup>, Bob<sup>1st</sup>, Charlie<sup>1st</sup>), David<sup>4th</sup>"
- Alice, Bob, Charlie: Ambiguously tied for 1st (order unknown)
- David: Clearly 4th

### Example 3: Ambiguous group in middle
"Alice<sup>1st</sup>, (Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>), David<sup>4th</sup>"
- Alice: Clearly 1st
- Bob and Charlie: Ambiguously tied for 2nd (order unknown)
- David: Clearly 4th

### Example 4: Multiple ambiguous groups
"(Alice<sup>1st</sup>, Bob<sup>1st</sup>), (Charlie<sup>3rd</sup>, David<sup>3rd</sup>), Eve<sup>5th</sup>"
- Alice and Bob: Ambiguously tied for 1st
- Charlie and David: Ambiguously tied for 3rd
- Eve: Clearly 5th

### Example 5: Mixed statistical and ambiguous
"Alice<sup>1st</sup>, Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>, (David<sup>4th</sup>, Eve<sup>4th</sup>)"
- Alice: Clearly 1st
- Bob and Charlie: Statistically tied for 2nd (we know they're equal)
- David and Eve: Ambiguously tied for 4th (order unknown)

## Implementation Notes

### Detecting Ambiguity

**Statistical Tie**:
- Same metric value (score, count, strength, etc.)
- We know they're equal
- Mark as `tied: true, ambiguous: false`

**Ambiguous**:
- Cannot determine metric or metric is identical but order is unknown
- No way to differentiate
- Mark as `tied: true, ambiguous: true`

### Frontend Rendering

```typescript
function formatWinnersWithOrdering(winnerOrder: WinnerOrder[]): string {
  // Group by position
  const groups = groupByPosition(winnerOrder);
  const parts: string[] = [];
  
  for (const [position, candidates] of Object.entries(groups)) {
    const isAmbiguous = candidates.some(c => c.ambiguous);
    const ordinal = getOrdinal(parseInt(position));
    
    if (isAmbiguous) {
      // Ambiguous group: prefix with parenthesis
      const names = candidates.map(c => `${c.candidate}<sup>${ordinal}</sup>`).join(', ');
      parts.push(`(${names})`);
    } else {
      // Statistical tie or clear ordering
      const names = candidates.map(c => `${c.candidate}<sup>${ordinal}</sup>`).join(', ');
      parts.push(names);
    }
  }
  
  return parts.join(', ');
}
```

## Key Distinction

**Statistical Tie**: We know candidates are equal (same metric value)
- Display: "Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>" (no parentheses)

**Ambiguous**: We cannot determine order (no metric or metric doesn't help)
- Display: "(Bob<sup>2nd</sup>, Charlie<sup>2nd</sup>)" (with parentheses prefix)

