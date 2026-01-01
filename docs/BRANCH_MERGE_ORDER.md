# Branch Merge Order Plan

This document provides the analysis and recommended merge order for creating the mega branch.

## Reference Documents

- **Process Plan**: `docs/BRANCH_MERGE_AND_PURGE_PLAN.md` - Step-by-step process
- **Analysis Script**: `scripts/analyze-branches.sh` - Run to get current state

## Quick Analysis Commands

Run these to get current branch state:

```bash
cd /Users/hzamir/work/lab-b

# 1. Find branches with unique commits
for branch in $(git branch | sed 's/^\* //' | sed 's/^  //' | grep -v '^+$'); do
  count=$(git log origin/main..$branch --oneline 2>/dev/null | wc -l | xargs)
  if [ "$count" -gt 0 ]; then
    echo "$branch: $count unique commits"
  fi
done

# 2. See branch relationships
git log --oneline --graph --all --decorate --simplify-by-decoration | head -50
```

## Recommended Merge Order

Based on branch analysis, merge in this order to minimize conflicts:

### Phase 1: Active Feature Branches (Highest Priority)

These are actively being worked on and should be merged first:

1. **elect-ui** - Current active work (126 commits ahead of origin/elect-ui)
   - Most recent work
   - Election platform features
   - Merge first to establish foundation

2. **scrappy** - Active work in lab-a worktree
   - Hebrew root scraper
   - Independent feature
   - Can merge after elect-ui

3. **lotto** - Standalone lottery feature
   - Independent work
   - No dependencies

4. **circle** - Music/playlist feature
   - Independent work
   - No dependencies

### Phase 2: Roots-Related Branches (Dependent on Foundation)

These build on or extend other work:

1. **roots-typescript-in-progress** - TypeScript conversion
   - May depend on roots work
   - Merge after foundation branches

2. **typescript-plus-roots-iframe** - Experimental iframe work
   - Experimental/exploratory
   - Merge after roots-typescript-in-progress

3. **roots-iframe-live** - Live iframe features
   - Merge after typescript work

4. **lotto-plus-roots** - Combines lotto and roots
   - Depends on both lotto and roots work
   - Merge after lotto and roots branches

### Phase 3: Infrastructure and Updates

1. **shared-worker** - Shared infrastructure
   - May be used by multiple features
   - Merge early if needed by other branches

2. **updates** - General updates
   - May contain fixes needed by other branches
   - Review and merge selectively

3. **dev** - Development improvements
   - General refactoring
   - Merge after feature branches

### Phase 4: Redundant/Historical Branches

These appear to share commits and may be redundant:

**7-23 series** (appear to share commits):
- **7-23** - Base branch
- **7-23.a, 7-23.b, 7-23.c, 7-23.d** - Variants, likely redundant
- **7-30** - Similar to 7-23
- **deploy/a** - Shares commits with 7-23.d
- **experiment** - Shares commits with deploy/a

**Recommendation**: 
- Review these branches
- Identify which has the most complete work
- Merge that one, skip the others
- Or merge 7-23 (base) and skip variants

**Older branches** (check if already merged):
- **5-22, 5-30, 6-20** - Older work, verify if already in main

## Detailed Merge Strategy

### Step 1: Create Mega Branch

```bash
cd /Users/hzamir/work/lab-b
git fetch origin
git checkout origin/main
git checkout -b mega-feature-branch
```

### Step 2: Merge Active Features (One at a Time)

```bash
# Merge elect-ui
git merge elect-ui --no-ff -m "🦾 Merge elect-ui branch into mega branch"
# Test compilation/build
pnpm tsc --noEmit && pnpm vite build

# Merge scrappy
git merge scrappy --no-ff -m "🦾 Merge scrappy branch into mega branch"
# Test

# Merge lotto
git merge lotto --no-ff -m "🦾 Merge lotto branch into mega branch"
# Test

# Merge circle
git merge circle --no-ff -m "🦾 Merge circle branch into mega branch"
# Test
```

### Step 3: Merge Dependent Branches

```bash
# Merge roots branches in order
git merge roots-typescript-in-progress --no-ff -m "🦾 Merge roots-typescript-in-progress"
# Test

git merge typescript-plus-roots-iframe --no-ff -m "🦾 Merge typescript-plus-roots-iframe"
# Test

git merge roots-iframe-live --no-ff -m "🦾 Merge roots-iframe-live"
# Test

git merge lotto-plus-roots --no-ff -m "🦾 Merge lotto-plus-roots"
# Test
```

### Step 4: Merge Infrastructure

```bash
git merge shared-worker --no-ff -m "🦾 Merge shared-worker"
# Test

git merge updates --no-ff -m "🦾 Merge updates"
# Test

git merge dev --no-ff -m "🦾 Merge dev"
# Test
```

### Step 5: Review and Merge Redundant Branches

```bash
# Review 7-23 series - pick the most complete
# If 7-23 has all the work:
git merge 7-23 --no-ff -m "🦾 Merge 7-23 (skip redundant variants)"
# Skip 7-23.a, 7-23.b, 7-23.c, 7-23.d, 7-30, deploy/a, experiment

# Or merge the most complete variant
```

## Conflict Resolution Strategy

**If conflicts occur**:

1. **Resolve conflicts** using your preferred method
2. **Test after resolution**: `pnpm tsc --noEmit && pnpm vite build`
3. **Commit resolution**: `git commit -m "🦾 Resolve conflicts from <branch> merge"`
4. **Continue** to next branch

## Testing After Each Merge

**Required checks**:
- [ ] TypeScript compilation: `pnpm tsc --noEmit`
- [ ] Build succeeds: `pnpm vite build` (or equivalent)
- [ ] No linter errors
- [ ] Key features still work (manual testing)

## Branch Cleanup (After Mega Branch Created)

**Branches that can be deleted** (after verifying they're in mega branch):

```bash
# After mega branch is created and tested
git branch --merged mega-feature-branch

# Delete merged branches (be careful!)
git branch -d <branch-name>
```

## Questions to Resolve

1. **7-23 series**: Which variant has the most complete work?
2. **5-22, 5-30, 6-20**: Are these already merged into main?
3. **Dependencies**: Are there any hidden dependencies between branches?
4. **Conflicts**: Which branches are most likely to conflict?

## Next Steps

1. **Run analysis commands** to get current state
2. **Review branch relationships** to identify dependencies
3. **Start with Phase 1** (active features)
4. **Merge incrementally** with testing
5. **Document any issues** encountered

---

*Update this document with actual analysis results before starting merges.*
