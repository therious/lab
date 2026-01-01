# GitHub Issues Workflow

This document describes the workflow for integrating GitHub Issues with development work, allowing requests to be tracked as tickets and commits to automatically update issue status.

## Overview

GitHub supports automatic issue management through commit message keywords. When commits are merged to the default branch, GitHub can automatically close or reference issues.

## Commit Message Keywords

GitHub recognizes these keywords in commit messages (case-insensitive):

- `Fixes #123` or `Fix #123` - Closes the issue when merged
- `Closes #123` or `Close #123` - Closes the issue when merged
- `Resolves #123` or `Resolve #123` - Closes the issue when merged
- `Refs #123` or `Ref #123` - References the issue without closing
- `Related to #123` - References the issue without closing

**Note**: These keywords only work when commits are merged to the default branch (usually `main` or `master`). They don't work on feature branches alone.

## Workflow Options

### Option 1: Manual Issue Creation (Recommended for AI Agent)

**When you make a request:**
1. You create a GitHub issue manually at `github.com/therious/lab/issues/new`
2. You provide me the issue number (e.g., "Work on issue #123")
3. I work on the issue and reference it in commits: `fix: Resolve tab highlighting issue (#123)`
4. When the PR is merged, GitHub automatically closes the issue

**Commit Message Format:**
```
<type>: <description> (#<issue-number>)

[Optional body explaining what was done]
```

**Examples:**
- `fix: Correct tab highlighting to ensure only one active tab (#123)`
- `feat: Add logout action and middleware (#124)`
- `refactor: Extract components from App.tsx (#125)`

### Option 2: AI Agent Creates Issues (Requires GitHub API Access)

**Limitation**: I don't currently have direct GitHub API access, so I cannot create issues programmatically. However, I can:

1. **Propose Issue Content**: When you make a request, I can draft the issue title and description for you to create
2. **You Create the Issue**: You create it manually and provide me the number
3. **I Reference It**: I reference the issue in all related commits

### Option 3: Hybrid Approach

1. **For Complex Requests**: You create an issue, I work on it with commit references
2. **For Simple Requests**: I work directly, you can optionally create an issue afterward for tracking
3. **For Existing Issues**: You direct me to an issue number, I work on it with commit references

## Workflow Steps

### Starting Work on an Issue

**When you say**: "Work on issue #123" or "Fix the problem in #123"

**I will**:
1. Acknowledge the issue number
2. Reference it in all related commits
3. Use appropriate keywords (`Fixes`, `Closes`, `Resolves`) in the final commit
4. Update the issue with progress if needed (via commit messages)

### Creating Issues from Requests

**When you make a request without an issue**:

**Option A - You Create It**:
1. You create the issue on GitHub
2. Provide me the issue number
3. I work on it with commit references

**Option B - I Draft It**:
1. I propose issue title and description
2. You create it (or I can provide a markdown template)
3. You provide the issue number
4. I work on it with commit references

### Commit Message Convention

**Format**:
```
<type>: <short description> (#<issue-number>)

<optional longer description>
```

**Types**:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

**Examples**:
```
fix: Correct tab highlighting logic (#123)

- Use exact path matching for ballot tabs
- Fix badge calculation to exclude unranked candidates
```

```
feat: Add logout functionality (#124)

- Add logout action to election slice
- Add middleware to clear sessionStorage
- Update success modal with logout button
```

### Closing Issues

**Automatic Closing**:
- When a PR containing `Fixes #123` is merged to the default branch, GitHub automatically closes issue #123

**Manual Closing**:
- You can close issues manually if needed
- Or use commit messages: `fix: Resolve issue (#123)` in the final commit

## GitHub Actions Integration

We can create a GitHub Action workflow to:
1. Comment on issues when commits reference them
2. Update issue labels based on commit types
3. Add more sophisticated automation

**Question**: Should we create a custom GitHub Action workflow for issue management?

## Best Practices

1. **One Issue Per Feature/Fix**: Each discrete feature or fix should have its own issue
2. **Reference in All Commits**: If working on issue #123, reference it in all related commits
3. **Use Final Commit for Closing**: Use `Fixes #123` in the final commit that completes the work
4. **Incremental Commits**: Still follow incremental commit pattern, but reference the issue in each
5. **Clear Descriptions**: Issue descriptions should be clear enough that someone else could work on them

## Example Workflow

**You**: "Fix the tab highlighting issue where multiple tabs appear active"

**I**: 
1. "I'll create an issue for this. Here's the proposed issue:
   - Title: Fix tab highlighting - multiple tabs showing as active
   - Description: [description]
   Please create this issue and provide the number."

**You**: "Created as #123"

**I**: 
1. Work on the fix
2. Commit: `fix: Correct tab highlighting logic (#123)`
3. Test and verify
4. Final commit: `fix: Resolve tab highlighting issue (#123)`

**When PR is merged**: GitHub automatically closes #123

## Questions for User

1. **Issue Creation**: Do you want me to draft issue content for you to create, or will you create issues directly?
2. **Commit Keywords**: Should I use `Fixes`, `Closes`, or `Resolves` in commit messages? (All work the same way)
3. **Multiple Commits**: Should every commit reference the issue, or just the final one?
4. **Issue Templates**: Should we create GitHub issue templates for common request types?
5. **Automation**: Should we create a GitHub Action workflow for enhanced issue management?

---

*This workflow integrates with the VibeCodingContract principles while adding issue tracking.*

