# Branch Merge and .specstory Purge Plan

This document outlines a safe, incremental approach to:
1. Analyze branches across lab, lab-a, and lab-b
2. Create a mega branch combining all features
3. Purge .specstory from entire git history
4. Clean up redundant branches
5. Ensure .specstory never gets committed going forward

## Current Situation

- **Git Worktrees**: `lab`, `lab-a`, and `lab-b` are all worktrees of the same repository
  - They share the same git history, branches, and remotes
  - Only one `.git` directory (typically in `lab`)
  - Changes in one worktree affect all worktrees
- **.specstory files**: Were tracked in git history (now removed from index)
- **Goal**: Mega branch with all features, clean history, safe merge to main

**Important**: Since these are worktrees, the purge and branch operations only need to be done once - they affect all worktrees automatically.

## Phase 1: Branch Analysis

### Step 1.1: Inventory All Branches

**Action**: Analyze branches in the shared repository (worktrees share branches)

**Note**: Since `lab`, `lab-a`, and `lab-b` are worktrees, they all share the same branches. We only need to analyze once.

**Commands to run**:
```bash
# From any worktree (they all see the same branches)
cd /Users/hzamir/work/lab-b  # or lab, or lab-a
git branch -a > /tmp/all-branches.txt
git worktree list > /tmp/worktrees.txt
```

### Step 1.2: Compare Branch Contents

**Action**: Identify which branches have unique work vs. duplicates

**Analysis needed**:
- List commits unique to each branch
- Identify branches with overlapping work
- Determine which branches are candidates for merging
- Identify branches that can be deleted (redundant)

**Commands**:
```bash
# Compare branches
git log --oneline --graph --all --decorate
git branch --merged main  # Branches already merged
git branch --no-merged main  # Branches with unique work
```

## Phase 2: Create Mega Branch

### Step 2.1: Create Clean Mega Branch from Main

**Action**: Create a new branch from main as the foundation

```bash
cd /Users/hzamir/work/lab-b
git checkout main
git pull origin main
git checkout -b mega-feature-branch
```

### Step 2.2: Incrementally Merge Features

**Strategy**: Merge branches one at a time, testing after each merge

**Process**:
1. Identify feature branch to merge
2. Merge into mega-feature-branch
3. Resolve conflicts
4. Test compilation/build
5. Commit resolution
6. Move to next branch

**Commands**:
```bash
# For each feature branch
git checkout mega-feature-branch
git merge <feature-branch> --no-ff -m "Merge <feature-branch> into mega branch"

# If conflicts
# Resolve conflicts
git add .
git commit -m "Resolve conflicts from <feature-branch> merge"
```

### Step 2.3: Handle Cross-Worktree Features

**Since all worktrees share the same repository**:

All branches are already available from any worktree. Simply merge them:

```bash
# From any worktree (lab-b, lab, or lab-a)
cd /Users/hzamir/work/lab-b
git checkout mega-feature-branch

# All branches are visible from any worktree
git merge <branch-name> --no-ff -m "Merge <branch-name> into mega branch"
```

**Note**: If a branch is checked out in another worktree, you may need to:
1. Switch to that worktree and checkout a different branch, OR
2. Use `git worktree add` to create a temporary worktree for that branch

## Phase 3: Purge .specstory from History

### Step 3.1: Verify .specstory in History

**Action**: Check if .specstory exists in any commits

```bash
# Find all commits that touched .specstory
git log --all --full-history -- .specstory

# Check if any .specstory files are tracked
git ls-files | grep specstory
```

### Step 3.2: Remove from Current Working Tree

**Action**: Ensure .specstory is properly ignored

```bash
# Add to .gitignore (if not already)
echo ".specstory/" >> .gitignore
echo ".specstory/**" >> .gitignore

# Remove from index if tracked
git rm -r --cached .specstory 2>/dev/null || true

# Commit the .gitignore change
git add .gitignore
git commit -m "Add .specstory to .gitignore"
```

### Step 3.3: Purge from Git History

**Warning**: This rewrites history. Only do this on the mega branch before merging to main.

**Option A - Using git filter-branch (deprecated but works)**:
```bash
git filter-branch --force --index-filter \
  "git rm -rf --cached --ignore-unmatch .specstory" \
  --prune-empty --tag-name-filter cat -- --all
```

**Option B - Using git filter-repo (recommended, requires installation)**:
```bash
# Install git-filter-repo first
# brew install git-filter-repo  # macOS
# pip install git-filter-repo     # Python

git filter-repo --path .specstory --invert-paths
```

**Option C - Using BFG Repo-Cleaner (fastest)**:
```bash
# Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-folders .specstory
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 3.4: Force Push (Only After Verification)

**Action**: Update remote branches (coordinate with team)

```bash
# Verify history is clean
git log --all --full-history -- .specstory  # Should return nothing

# Force push to mega branch (not main yet!)
git push origin mega-feature-branch --force
```

## Phase 4: Clean Up Redundant Branches

### Step 4.1: Identify Redundant Branches

**After mega branch is created**:
- Branches fully merged into mega branch can be deleted
- Branches with no unique commits can be deleted
- Keep branches that have work not yet in mega branch

**Commands**:
```bash
# List branches merged into mega branch
git branch --merged mega-feature-branch

# List branches with unique commits
git branch --no-merged mega-feature-branch
```

### Step 4.2: Delete Redundant Branches

**Action**: Remove branches that are fully merged

```bash
# Delete local branches
git branch -d <branch-name>

# Delete remote branches (after verification)
git push origin --delete <branch-name>
```

## Phase 5: Prevent Future .specstory Commits

### Step 5.1: Update .gitignore

**Action**: Ensure .specstory is properly ignored

```bash
# Add comprehensive patterns
cat >> .gitignore << EOF

# SpecStory AI interaction history (never commit)
.specstory/
.specstory/**
**/.specstory/
**/.specstory/**
EOF

git add .gitignore
git commit -m "Ensure .specstory is never committed"
```

### Step 5.2: Add Pre-commit Hook (Optional)

**Action**: Prevent accidental commits of .specstory

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Prevent .specstory from being committed
if git diff --cached --name-only | grep -q '\.specstory'; then
    echo "Error: .specstory files cannot be committed"
    echo "These files should be recorded in GitHub issues/discussions instead"
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

### Step 5.3: Document Workflow

**Action**: Update documentation to clarify .specstory should be in tickets

- Interactions should be recorded in GitHub issues/discussions
- .specstory is for local reference only
- Never commit .specstory files

## Phase 6: Final Merge to Main

### Step 6.1: Final Testing

**Action**: Comprehensive testing of mega branch

```bash
# Run all tests
pnpm test  # or equivalent

# Verify builds
pnpm build  # or equivalent

# Check for any .specstory references
git log --all --full-history -- .specstory  # Should be empty
```

### Step 6.2: Create PR

**Action**: Create pull request from mega branch to main

- PR should be comprehensive
- Include list of all features merged
- Note that .specstory has been purged from history
- Request review before merging

### Step 6.3: Merge to Main

**After PR approval**:
```bash
git checkout main
git merge mega-feature-branch --no-ff
git push origin main
```

## Safety Checklist

Before proceeding, verify:

- [ ] All branches analyzed and documented
- [ ] Mega branch created from clean main
- [ ] Features merged incrementally with testing
- [ ] .specstory verified as removed from history
- [ ] Redundant branches identified
- [ ] .gitignore updated
- [ ] Pre-commit hook installed (optional)
- [ ] Mega branch fully tested
- [ ] PR created and reviewed
- [ ] Team notified of history rewrite

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup
git checkout main
git branch -D mega-feature-branch

# Or restore specific branch
git reflog
git checkout <commit-hash>
git checkout -b recovery-branch
```

## Questions to Resolve

1. **Which directory is the "source of truth"**? (lab, lab-a, or lab-b)
2. **Are all three directories the same repo** or different repos?
3. **Do you have backups** of all three directories before starting?
4. **Are there other collaborators** who need to be notified of history rewrite?
5. **Preferred purge method**: git filter-repo, BFG, or filter-branch?

---

*This plan should be executed incrementally with verification at each step.*

