# Options for Managing .specstory Interactions

This document outlines options for purging or managing the `.specstory` directory that contains logged AI agent interactions.

## Current State

- **Location**: `./.specstory/`
- **Size**: ~2.7MB
- **Contents**: History of AI agent interactions, project metadata
- **Status**: Currently tracked/untracked (check `.gitignore`)

## Purge Options

### Option 1: Complete Removal (Recommended if Not Needed)

**If you don't need to preserve any .specstory data:**

```bash
# Remove the entire directory
rm -rf .specstory

# Ensure it's in .gitignore to prevent re-adding
echo ".specstory/" >> .gitignore

# If it was previously tracked, remove from git
git rm -r --cached .specstory 2>/dev/null || true
```

**Pros**: Clean slate, removes all interaction history
**Cons**: Loses all historical context

### Option 2: Archive and Remove

**If you want to preserve but not keep in project:**

```bash
# Create archive outside project
mkdir -p ~/archives
tar -czf ~/archives/specstory-$(date +%Y%m%d).tar.gz .specstory

# Remove from project
rm -rf .specstory

# Add to .gitignore
echo ".specstory/" >> .gitignore
```

**Pros**: Preserves history for later reference, removes from project
**Cons**: Takes up space elsewhere

### Option 3: Selective Cleanup

**If you want to keep some but remove sensitive data:**

```bash
# Review what's in history
ls -lh .specstory/history/

# Remove specific files or date ranges
# Example: Remove files older than 30 days
find .specstory/history -type f -mtime +30 -delete

# Or remove specific date ranges
find .specstory/history -name "2024-*" -delete
```

**Pros**: Keeps recent/relevant history, removes old data
**Cons**: Requires manual review to identify what to keep

### Option 4: Git Cleanup (If Previously Tracked)

**If .specstory was accidentally committed to git:**

```bash
# Remove from git history (requires git filter-branch or BFG)
# WARNING: This rewrites history - coordinate with team

# Option A: Remove from current commit only
git rm -r --cached .specstory
echo ".specstory/" >> .gitignore
git commit -m "Remove .specstory from tracking"

# Option B: Remove from entire history (advanced)
# Use git filter-branch or BFG Repo-Cleaner
# See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
```

**Pros**: Removes from git history completely
**Cons**: Rewrites history, requires coordination

### Option 5: Move to Excluded Location

**If you want to keep but exclude from project:**

```bash
# Move to docs/exclude (already in .gitignore)
mkdir -p docs/exclude
mv .specstory docs/exclude/

# Or move outside project entirely
mv .specstory ~/.specstory-archive/
```

**Pros**: Keeps data accessible, removes from project root
**Cons**: Still takes up space

## Recommended Approach

**For your use case (preparing to give token access):**

1. **Archive the current .specstory**:
   ```bash
   tar -czf ~/specstory-backup-$(date +%Y%m%d).tar.gz .specstory
   ```

2. **Remove from project**:
   ```bash
   rm -rf .specstory
   ```

3. **Ensure it's ignored**:
   ```bash
   echo ".specstory/" >> .gitignore
   git add .gitignore
   git commit -m "Add .specstory to .gitignore"
   ```

4. **If it was tracked, remove from git**:
   ```bash
   git rm -r --cached .specstory 2>/dev/null || true
   git commit -m "Remove .specstory from git tracking"
   ```

## Prevention

**To prevent .specstory from being created/tracked in future:**

1. **Add to .gitignore** (already recommended above)
2. **Configure tool** (if .specstory is from a specific tool, check its config)
3. **Use .git/info/exclude** for local-only ignores (not shared)

## Questions to Consider

1. **Do you need any of this history?** If no → Option 1
2. **Was it committed to git?** If yes → Option 4
3. **Do you want to preserve for reference?** If yes → Option 2
4. **Is there sensitive data?** If yes → Option 1 or 3

---

*After purging, you can safely provide the GitHub token for issue/discussion management.*

