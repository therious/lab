# Branch Merge Order Plan

This document provides the recommended merge order based on branch analysis.

## Reference Documents

- **Process Plan**: `docs/BRANCH_MERGE_AND_PURGE_PLAN.md` - Step-by-step process
- **Analysis Results**: `docs/BRANCH_ANALYSIS_RESULTS.md` - Detailed branch analysis
- **Analysis Script**: `scripts/analyze-branches.sh` - Run to refresh analysis

## Summary of Branches with Unique Work

**Total branches with unique commits**: 18 branches

**Largest branches** (most unique commits):
1. **elect-ui**: 386 commits (largest, most recent work)
2. **scrappy**: 254 commits (Hebrew root scraper)
3. **roots-iframe-live**: 235 commits (roots iframe features)
4. **typescript-plus-roots-iframe**: 148 commits (experimental iframe)
5. **roots-typescript-in-progress**: 120 commits (TypeScript conversion)
6. **lotto-plus-roots**: 105 commits (combines lotto + roots)
7. **lotto**: 92 commits (lottery feature)
8. **circle**: 62 commits (music/playlist feature)

**Redundant branches** (share commits):
- **7-23.d, deploy/a, experiment**: All share same 27 commits
- **7-23.a, 7-23.b**: Share same 25 commits
- **7-23.c**: 26 commits (slightly different)
- **7-23**: Only 1 unique commit
- **7-30**: Only 1 unique commit

## Recommended Merge Order

### Phase 1: Active Feature Branches (Highest Priority)

These are the largest, most active branches. Merge first to establish foundation.

**Order**:
1. **elect-ui** (386 commits)
   - Most recent work
   - Election platform - complete feature
   - Merge first as it's the most developed

2. **scrappy** (254 commits)
   - Hebrew root scraper
   - Independent feature
   - Active work in lab-a worktree

3. **roots-iframe-live** (235 commits)
   - Roots iframe features
   - May have dependencies on roots work

4. **lotto** (92 commits)
   - Standalone lottery feature
   - Independent work

5. **circle** (62 commits)
   - Music/playlist feature
   - Independent work

### Phase 2: Roots-Related Branches (Dependent Work)

These build on or extend roots work. Merge after foundation branches.

**Order**:
1. **roots-typescript-in-progress** (120 commits)
   - TypeScript conversion work
   - May be needed by other roots branches

2. **typescript-plus-roots-iframe** (148 commits)
   - Experimental iframe work
   - Depends on roots + typescript work

3. **lotto-plus-roots** (105 commits)
   - Combines lotto and roots
   - **Must merge after both lotto AND roots branches**
   - Merge after lotto, roots-typescript-in-progress, and roots-iframe-live

### Phase 3: Infrastructure and Updates

1. **shared-worker** (21 commits)
   - Shared infrastructure
   - May be used by multiple features
   - Merge early if needed, otherwise after features

2. **updates** (3 commits)
   - General updates
   - Small, safe to merge anytime

3. **dev** (33 commits)
   - Development improvements
   - General refactoring
   - Merge after feature branches

### Phase 4: Older/Historical Branches

1. **6-20** (29 commits)
   - Older work (June 2020)
   - Review to ensure not already merged

2. **5-30** (25 commits)
   - Older work (May 2020)
   - Review to ensure not already merged

3. **5-22** (16 commits)
   - Older work (May 2020)
   - Review to ensure not already merged

### Phase 5: Redundant Branches (Pick One)

**7-23 series** - These share commits and appear redundant:

**Analysis**:
- **7-23.d** (27 commits) - Has bip39.ts + commit-info.yaml work
- **deploy/a** (27 commits) - Same as 7-23.d
- **experiment** (27 commits) - Same as 7-23.d
- **7-23.c** (26 commits) - Similar, missing bip39.ts
- **7-23.a, 7-23.b** (25 commits each) - Same commits
- **7-23** (1 commit) - Base branch, only 1 unique commit
- **7-30** (1 commit) - Only 1 unique commit

**Recommendation**:
- **Merge 7-23.d** (most complete - has bip39.ts + all other work)
- **Skip**: deploy/a, experiment, 7-23.a, 7-23.b, 7-23.c (redundant)
- **Review**: 7-23 and 7-30 (only 1 commit each - may already be in main)

## Detailed Merge Sequence

```bash
cd /Users/hzamir/work/lab-b
git fetch origin
git checkout origin/main
git checkout -b mega-feature-branch

# Phase 1: Active Features
git merge elect-ui --no-ff -m "🦾 Merge elect-ui (386 commits)"
# Test: pnpm tsc --noEmit && pnpm vite build

git merge scrappy --no-ff -m "🦾 Merge scrappy (254 commits)"
# Test

git merge roots-iframe-live --no-ff -m "🦾 Merge roots-iframe-live (235 commits)"
# Test

git merge lotto --no-ff -m "🦾 Merge lotto (92 commits)"
# Test

git merge circle --no-ff -m "🦾 Merge circle (62 commits)"
# Test

# Phase 2: Roots Dependencies
git merge roots-typescript-in-progress --no-ff -m "🦾 Merge roots-typescript-in-progress (120 commits)"
# Test

git merge typescript-plus-roots-iframe --no-ff -m "🦾 Merge typescript-plus-roots-iframe (148 commits)"
# Test

git merge lotto-plus-roots --no-ff -m "🦾 Merge lotto-plus-roots (105 commits)"
# Test - depends on lotto + roots work

# Phase 3: Infrastructure
git merge shared-worker --no-ff -m "🦾 Merge shared-worker (21 commits)"
# Test

git merge updates --no-ff -m "🦾 Merge updates (3 commits)"
# Test

git merge dev --no-ff -m "🦾 Merge dev (33 commits)"
# Test

# Phase 4: Older Branches (review first)
git merge 6-20 --no-ff -m "🦾 Merge 6-20 (29 commits)"
# Test

git merge 5-30 --no-ff -m "🦾 Merge 5-30 (25 commits)"
# Test

git merge 5-22 --no-ff -m "🦾 Merge 5-22 (16 commits)"
# Test

# Phase 5: Redundant (pick one)
git merge 7-23.d --no-ff -m "🦾 Merge 7-23.d (27 commits, most complete)"
# Test
# Skip: deploy/a, experiment, 7-23.a, 7-23.b, 7-23.c (redundant)

# Review these (only 1 commit each):
# git merge 7-23 --no-ff (if needed)
# git merge 7-30 --no-ff (if needed)
```

## Conflict Resolution

**If conflicts occur**:

1. **Resolve conflicts** manually or with merge tools
2. **Test after resolution**: `pnpm tsc --noEmit && pnpm vite build`
3. **Commit resolution**: `git commit -m "🦾 Resolve conflicts from <branch> merge"`
4. **Continue** to next branch

## Testing Checklist

After each merge:
- [ ] TypeScript compilation: `pnpm tsc --noEmit`
- [ ] Build succeeds: `pnpm vite build` (or equivalent)
- [ ] No linter errors
- [ ] Key features still work (manual testing if possible)

## Branch Cleanup (After Mega Branch)

**After mega branch is created and tested**, identify branches to delete:

```bash
# List branches fully merged into mega branch
git branch --merged mega-feature-branch

# Delete redundant branches (after verification)
git branch -d deploy/a experiment 7-23.a 7-23.b 7-23.c
```

## Questions to Resolve Before Starting

1. **7-23 series**: Confirm 7-23.d is the most complete (has bip39.ts)
2. **7-23 and 7-30**: Review if the 1 commit each is already in main
3. **5-22, 5-30, 6-20**: Verify these aren't already merged (they're old)
4. **Dependencies**: Are there any hidden dependencies between branches?

## Estimated Merge Order Summary

**Total branches to merge**: ~15-16 (skipping redundant ones)

**Order**:
1. elect-ui (386)
2. scrappy (254)
3. roots-iframe-live (235)
4. lotto (92)
5. circle (62)
6. roots-typescript-in-progress (120)
7. typescript-plus-roots-iframe (148)
8. lotto-plus-roots (105) ← **after lotto + roots branches**
9. shared-worker (21)
10. updates (3)
11. dev (33)
12. 6-20 (29)
13. 5-30 (25)
14. 5-22 (16)
15. 7-23.d (27) ← **skip redundant variants**

**Skip (redundant)**:
- deploy/a, experiment (same as 7-23.d)
- 7-23.a, 7-23.b, 7-23.c (redundant variants)
- 7-23, 7-30 (review - only 1 commit each)

---

*See `docs/BRANCH_ANALYSIS_RESULTS.md` for detailed commit lists per branch.*
