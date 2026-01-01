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

**Required Format**:
```
🦾 [project-prefix]: <short one-liner> (#<issue-number>)

<extended body with details/bullet points>
```

**Components**:
1. **🦾 Emoji**: Always start with mechanical arm emoji (indicates assisted coding - leverage of agent performing individual requests on demand, not autonomous robot)
2. **Project Prefix**: Use `elect:` for elect project, omit for general commits
3. **Short Description**: One-line summary of what the commit fundamentally does
4. **Issue Reference**: Include `(#<issue-number>)` when working on an issue
5. **Extended Body**: Blank line, then bullet points or detailed explanation

**Examples**:
```
🤖 elect: Fix tab highlighting to ensure only one active tab (#123)

- Use exact path matching for ballot tabs instead of startsWith
- Fix badge calculation to correctly exclude unranked candidates
- Ensure Summary and Results tabs use consistent active state logic
```

```
🤖 elect: Refactor component structure (#124)

- Extract SummaryView component from App.tsx
- Extract constants to dedicated constants.ts file
- Extract utility functions to utils.tsx
```

```
🤖 elect: Resolves #124 - Implement logout functionality

- Add logout action to election slice that restores initial state
- Add middleware to clear sessionStorage before logout action
- Update success modal with Logout (default) and View Results buttons
- Add hover logout button to UserProfile component
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

## GitHub API Access

### Personal Access Token (PAT)

**Yes, you can provide a GitHub Personal Access Token for issue and discussion management.**

**Token Requirements**:
- **Scopes Needed**: 
  - `repo` scope (includes issues and discussions read/write) OR
  - Fine-grained token with `Issues: Read and write` and `Discussions: Read and write` permissions for `therious/lab` repository
- **Security**: Store token securely, set expiration date
- **Usage**: I will use the token via GitHub CLI (`gh`) or HTTP requests to create/update issues and discussions

**To Generate Token**:
1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic) or fine-grained token
3. Select `repo` scope (for classic) or `Issues: Read and write` + `Discussions: Read and write` (for fine-grained)
4. Copy token securely (only shown once)

**When Token is Provided**:
- **Issues**: I will create and update issues directly when you ask me to
- **Discussions**: If you say something is "for discussion", I will create a GitHub Discussion in `therious/lab` project rather than committing to project documentation prematurely
- **Actions**: I will use the token to perform any GitHub issue/discussion actions you request

**Note**: Before providing the token, you may want to purge `.specstory` interaction logs. See `docs/SPECSTORY_PURGE_OPTIONS.md` for options.

## Commit Messages vs PR Messages

**Answer to Question 2**: Yes, commit messages (not just PR messages) can impact issue status when merged to the default branch. GitHub scans all commit messages in a PR when it's merged.

**How It Works**:
- When a PR is merged to `main`/`master`, GitHub scans all commit messages in that PR
- If any commit contains `Fixes #123`, `Closes #123`, or `Resolves #123`, the issue is automatically closed
- This works even if the PR description doesn't mention the issue

**Best Practice**: Use `Resolves #123` in the final commit that completes the work.

## Manual vs Automatic Issue Closing

**Answer to Question 3**: You have two options:

**Option A - Automatic Closing (Recommended)**:
- Use `Resolves #123` in the final commit
- GitHub automatically closes the issue when PR is merged
- You can still manually close if needed

**Option B - Manual Closing**:
- Reference issues in commits: `🦾 elect: Fix tab highlighting (#123)`
- Don't use closing keywords
- You manually close issues when you consider them done
- More control, but requires manual tracking

**Recommendation**: Use automatic closing with `Resolves #123` in final commit, but you can always manually close/reopen if needed.

## Multiple Commits Per Issue

**When working on an issue that requires multiple commits** (e.g., refactor → utilities → feature):

1. **Refactor commit**: `🦾 elect: Refactor component structure (#123)`
2. **Utilities commit**: `🦾 elect: Add utility functions for formatting (#123)`
3. **Feature commit**: `🦾 elect: Resolves #123 - Implement new feature`

All commits reference the issue, but only the final one uses `Resolves` to close it.

## Remaining Questions

1. **Issue Creation**: Do you want me to draft issue content for you to create, or will you provide a token for me to create issues directly?
2. **Issue Templates**: Should we create GitHub issue templates for common request types?
3. **Automation**: Should we create a GitHub Action workflow for enhanced issue management?

---

*This workflow integrates with the VibeCodingContract principles while adding issue tracking.*

