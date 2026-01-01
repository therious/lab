# Plan: Tennessee Capital City Election Test Data

## Objective
Generate test votes for a Tennessee capital city election that matches Wikipedia examples for various voting methods. This will allow us to compare our algorithm implementations against established reference results.

## Background
The Tennessee capital city election is a classic example used in voting theory literature and Wikipedia pages to demonstrate:
- Condorcet methods (Ranked Pairs, Schulze)
- Instant Runoff Voting (IRV)
- Score voting
- Other methods

## Election Setup

### Candidates
The candidates are the four largest cities in Tennessee:
1. Memphis
2. Nashville
3. Chattanooga
4. Knoxville

### Vote Distribution
Based on Wikipedia examples, the typical vote distribution is:
- 42%: Memphis > Nashville > Chattanooga > Knoxville
- 26%: Nashville > Chattanooga > Knoxville > Memphis
- 15%: Chattanooga > Knoxville > Nashville > Memphis
- 17%: Knoxville > Chattanooga > Nashville > Memphis

(Note: Exact percentages may vary by source - we'll need to verify against specific Wikipedia pages)

## Implementation Plan

### Phase 1: Research and Verification
1. **Identify Wikipedia Sources**
   - Find specific Wikipedia pages that use this example
   - Document the exact vote counts/percentages used
   - Note which methods are demonstrated on each page
   - Capture expected results for each method

2. **Verify Algorithm Names**
   - Check if it's called "Schulze" or "Shulze" in sources
   - Verify "Ranked Pairs" vs "Tideman" naming
   - Confirm IRV vs STV terminology

### Phase 2: Election Configuration
1. **Create YAML Configuration**
   - File: `tennessee-capital-city.yaml`
   - Identifier: `tennessee-capital-city`
   - Title: "Tennessee Capital City Election"
   - Description: "Classic voting theory example: choosing the capital city of Tennessee"
   - Voting window: Set to closed (historical example)
   - Single ballot: "Capital City of Tennessee"
   - 4 candidates: Memphis, Nashville, Chattanooga, Knoxville
   - Number of winners: 1

2. **Candidate Order**
   - Use alphabetical or Wikipedia order
   - Ensure consistency with reference materials

### Phase 3: Vote Generation
1. **Create Test Data Module**
   - File: `lib/elections/test_data/tennessee_capital.ex`
   - Function: `create_tennessee_capital_votes/1` (takes election_identifier)
   - Generate votes matching the distribution above

2. **Vote Format**
   - Convert rankings to our score band format (0-5)
   - For ranked ballots: assign scores based on position
     - 1st choice: 5
     - 2nd choice: 4
     - 3rd choice: 3
     - 4th choice: 2
   - Or use explicit rankings if our format supports it

3. **Vote Count**
   - Use percentages to determine vote counts
   - Example: If using 100 total votes:
     - 42 votes: Memphis(5), Nashville(4), Chattanooga(3), Knoxville(2)
     - 26 votes: Nashville(5), Chattanooga(4), Knoxville(3), Memphis(2)
     - 15 votes: Chattanooga(5), Knoxville(4), Nashville(3), Memphis(2)
     - 17 votes: Knoxville(5), Chattanooga(4), Nashville(3), Memphis(2)

### Phase 4: Validation
1. **Calculate Results**
   - Run all algorithms on the test data
   - Capture results for each method

2. **Compare with References**
   - Compare our results with Wikipedia examples
   - Document any discrepancies
   - Investigate and fix algorithm issues if results don't match

3. **Expected Results (to be verified)**
   - Ranked Pairs: Should show Nashville as winner (Condorcet winner)
   - Schulze: Should match Ranked Pairs
   - IRV: Should eliminate candidates in order, final winner may differ
   - Score: Should show average scores
   - Coombs: Should eliminate based on last-place votes

### Phase 5: Documentation
1. **Create Results Comparison Document**
   - Document our results vs Wikipedia results
   - Note any differences and explanations
   - Include vote distribution used

2. **Update Test Documentation**
   - Add to testing guide
   - Include instructions for regenerating test data

## Implementation Notes

### Vote Generation Strategy
- Use `Elections.TestData` module pattern (like `create_walnut_hills_votes`)
- Generate votes in election-specific database
- Use realistic timestamps spread over voting window
- Ensure votes are properly formatted for our ballot_data structure

### Algorithm Verification
- Test each algorithm independently
- Verify Condorcet winner detection
- Check IRV elimination order
- Validate score calculations

### Future Enhancements
- Add more classic voting theory examples
- Create comparison tool to show results side-by-side
- Generate visualizations matching Wikipedia examples

## References to Check
- Wikipedia: "Condorcet method" page
- Wikipedia: "Instant-runoff voting" page
- Wikipedia: "Schulze method" page
- Wikipedia: "Ranked pairs" page
- Any voting theory textbooks that use this example

## Success Criteria
- [ ] Test votes generated matching Wikipedia distribution
- [ ] All algorithms produce results
- [ ] Results match or are explainably different from Wikipedia examples
- [ ] Documentation complete with comparison
- [ ] Results can be regenerated consistently

