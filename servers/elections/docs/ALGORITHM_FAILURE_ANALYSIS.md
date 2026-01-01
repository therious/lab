# Algorithm Failure Analysis: Coombs and IRV/STV

## Common Failure Reasons

### Coombs Method Failures

1. **Empty Rankings**
   - **Issue**: If all candidates are eliminated or rankings become empty
   - **Location**: `count_last_preferences` when no remaining candidates in ranking
   - **Symptom**: `Enum.max_by` on empty list
   - **Fix**: Check if `last_prefs` is empty before calling `Enum.max_by`

2. **Empty Remaining Candidates List**
   - **Issue**: If `remaining` becomes empty before finding enough winners
   - **Location**: `run_coombs_rounds` when `remaining` is `[]`
   - **Symptom**: `Enum.find` returns `nil`, causing issues in counting
   - **Fix**: Add guard clause to check if `remaining` is empty

3. **Division by Zero in Quota Calculation**
   - **Issue**: If `number_of_winners + 1` results in division issues
   - **Location**: `quota = div(total_votes, number_of_winners + 1) + 1`
   - **Symptom**: Arithmetic error
   - **Fix**: Ensure `number_of_winners >= 1` and `total_votes > 0`

4. **Ranking Becomes Empty After Eliminations**
   - **Issue**: After eliminating candidates, some rankings may become empty lists
   - **Location**: `eliminate_candidate` can produce empty lists
   - **Symptom**: `List.first(r)` on empty list returns `nil`
   - **Fix**: Filter out empty rankings or handle `nil` in `List.first`

### IRV/STV Failures

1. **Empty Rankings**
   - **Issue**: Similar to Coombs - rankings can become empty
   - **Location**: `count_first_preferences` when ranking is empty
   - **Symptom**: `Enum.find` on empty list returns `nil`
   - **Fix**: Check if ranking is empty before processing

2. **All Candidates Eliminated**
   - **Issue**: If all candidates are eliminated before finding winners
   - **Location**: `run_rounds` when `remaining` is empty
   - **Symptom**: `Enum.min_by` on empty list
   - **Fix**: Check if `still_remaining` is empty before elimination

3. **Tie in Last Place (Multiple Candidates with Same Count)**
   - **Issue**: `Enum.min_by` may not handle ties correctly
   - **Location**: Elimination logic when multiple candidates have same lowest count
   - **Symptom**: Unpredictable elimination order
   - **Fix**: Use deterministic tie-breaking (e.g., alphabetical order)

4. **Quota Calculation Edge Cases**
   - **Issue**: Quota calculation for edge cases (very few votes, many winners)
   - **Location**: `quota = div(total_votes, number_of_winners + 1) + 1`
   - **Symptom**: Quota may be larger than total votes
   - **Fix**: Ensure quota is at most `total_votes`

5. **Ranking Format Issues**
   - **Issue**: Rankings may contain duplicates or invalid candidates
   - **Location**: `build_ranking_from_ballot` may produce invalid rankings
   - **Symptom**: Candidates not found in `remaining` list
   - **Fix**: Filter rankings to only include valid candidates

## Recommended Fixes

### For Coombs:
1. Add empty list checks before `Enum.max_by` in `count_last_preferences`
2. Add guard for empty `remaining` list
3. Filter out empty rankings after elimination
4. Handle `nil` from `List.first` on empty lists

### For IRV/STV:
1. Add empty list checks before `Enum.min_by` in elimination
2. Add guard for empty `remaining` list
3. Implement deterministic tie-breaking
4. Validate quota calculation
5. Filter rankings to remove invalid candidates

