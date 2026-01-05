# Understanding Our Multi-Method Ballot Algorithms

## Overview

Our election system calculates results using six different voting methods simultaneously. This document explains why we use multiple methods, how they complement each other, and what their agreement tells us about the legitimacy of the outcome.

## Why Condorcet Methods Drive Results

### The Condorcet Principle

When a **Condorcet winner** exists—a candidate who would beat every other candidate in a head-to-head comparison—Condorcet methods (Ranked Pairs and Schulze) identify and select that winner. This is our primary result because:

1. **It reflects true majority preference**: If a candidate beats all others in pairwise comparisons, they represent the strongest consensus choice.

2. **It satisfies the Condorcet criterion**: This is considered one of the most fundamental fairness criteria in voting theory.

3. **It's robust to strategic voting**: When a Condorcet winner exists, it's difficult to manipulate the result through strategic voting.

### Voting Criteria: What Condorcet Methods Satisfy

✅ **Condorcet Criterion**: Always selects the Condorcet winner when one exists  
✅ **Majority Criterion**: If a candidate receives a majority of first-preference votes, they win  
✅ **Smith Criterion**: The winner is always in the Smith set (the smallest set of candidates who beat all candidates outside the set)  
✅ **Independence of Clones**: Adding or removing similar candidates doesn't change the relative ranking of other candidates  

### Voting Criteria: Where Condorcet Methods Fall Short

❌ **Monotonicity**: In rare cases, giving a candidate more support can actually cause them to lose (though this is extremely uncommon in practice)  
❌ **Participation Criterion**: In some edge cases, additional voters participating can change the winner in ways that seem counterintuitive  
❌ **Independence of Irrelevant Alternatives (IIA)**: The relative ranking of two candidates can change based on the presence or absence of a third candidate  

## How Other Methods Complement Condorcet

### Rating Methods: Score and Approval Voting

**What they add:**
- **Intensity of preference**: Unlike ranked methods that only care about order, rating methods capture *how much* voters prefer each candidate
- **Simplicity and transparency**: Easy to understand and verify—highest average score or approval count wins
- **Resistance to strategic voting**: Score voting in particular is difficult to manipulate when voters are honest

**How they complement Condorcet:**
- When a Condorcet winner exists and also wins under Score/Approval, it confirms the result is robust
- When no Condorcet winner exists, Score/Approval provide a clear, intuitive alternative
- They satisfy different criteria: Score voting satisfies **monotonicity** (which Condorcet methods can fail), making agreement between them particularly meaningful

**Voting Criteria:**
✅ **Monotonicity**: More support never hurts a candidate  
✅ **Participation**: Additional voters can only help their preferred candidates  
⚠️ **Condorcet Criterion**: May not always select the Condorcet winner (but often does in practice)  

### Runoff Methods: IRV/STV and Coombs

**What they add:**
- **Majority guarantee**: These methods ensure the winner has broad support by eliminating candidates with the least first-preference support
- **Preference transfer**: Votes from eliminated candidates transfer to remaining candidates, ensuring votes aren't "wasted"
- **Proportional representation**: STV (for multiple winners) provides proportional representation, ensuring diverse representation

**How they complement Condorcet:**
- When a Condorcet winner exists and also wins under IRV/Coombs, it confirms the winner has both pairwise dominance AND broad first-preference support
- They satisfy **monotonicity** and **majority criterion**, providing a different perspective on fairness
- In cases where Condorcet methods produce a cycle (no clear winner), runoff methods provide a clear resolution

**Voting Criteria:**
✅ **Majority Criterion**: A candidate with majority first-preference votes always wins  
✅ **Monotonicity**: More support never hurts  
✅ **Later-no-harm**: Ranking additional candidates below your first choice doesn't hurt your first choice  
⚠️ **Condorcet Criterion**: May not always select the Condorcet winner (the "center-squeeze" effect)  

## Why Agreement Across Methods Matters

### The Robustness Guarantee

When multiple methods from different families (Condorcet, Rating, Runoff) all produce the same winner, it provides strong evidence that:

1. **The result is legitimate**: The winner is not an artifact of a particular method's quirks or vulnerabilities

2. **Strategic voting is ineffective**: Different methods are vulnerable to different types of strategic manipulation. When they all agree, it means:
   - Strategic voting that works against one method would fail against others
   - The winner is the genuine preference of the electorate, not a result of manipulation

3. **The outcome is stable**: The result doesn't depend on which method is used, suggesting it reflects true voter preferences

### What Disagreement Tells Us

When methods disagree, it reveals important information:

- **No Condorcet winner exists**: The electorate has cyclical preferences (A beats B, B beats C, but C beats A)
- **Different fairness perspectives**: Each method prioritizes different aspects of fairness, and the electorate's preferences don't align with a single perspective
- **Close election**: The candidates are genuinely competitive, and small changes in votes could change the outcome

In these cases, we present all results transparently, allowing voters to see the full picture of how different fairness criteria would resolve the election.

## Method Families Summary

| Method Family | Primary Strength | Key Criterion | Complements Condorcet By |
|--------------|------------------|---------------|-------------------------|
| **Condorcet** (Ranked Pairs, Schulze) | Pairwise majority preference | Condorcet Criterion | Primary method—identifies consensus winner |
| **Rating** (Score, Approval) | Intensity of preference | Monotonicity | Provides monotonicity guarantee that Condorcet lacks |
| **Runoff** (IRV/STV, Coombs) | Broad first-preference support | Majority Criterion | Ensures winner has broad support, not just pairwise dominance |

## Conclusion

Our multi-method approach doesn't just calculate results—it provides a **robustness check** against manipulation and a **transparency guarantee** that the outcome reflects genuine voter preferences. When methods agree, we can be confident the result is legitimate. When they disagree, we gain insight into the complexity of voter preferences and the trade-offs inherent in any voting system.

The Condorcet methods drive our primary results because they identify the candidate who beats all others in head-to-head comparisons—the strongest possible consensus. But the agreement of other methods provides the crucial guarantee that this result is robust, fair, and resistant to strategic manipulation.
