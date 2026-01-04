# Vibe Coding Contract

This document captures the coding principles, rules, and expectations for AI agent interactions in this project. Review this document at the start of each session to ensure consistency.

## Core Principles

### 1. Incremental Development and Commits

- **Discrete Commits**: Each feature or fix must be in its own commit. Never bundle multiple unrelated changes into a single commit.
- **Refactoring First**: If refactoring is necessary to implement a feature:
  1. Test and commit the refactoring first
  2. Then commit the feature that leverages the refactoring
- **Utilities First**: If new utilities are needed for a feature:
  1. Test and commit the utilities first
  2. Then commit the feature that uses them
- **Commit Message Format**: 
  - **Required Format**: `🦾 [project-prefix]: <short one-liner> (#<issue-number>)`
  - **Emoji Prefix**: Always start with 🦾 (mechanical arm emoji) to indicate assisted coding - symbolizes leverage of agent performing individual requests on demand (not autonomous robot)
  - **Project Prefix**: Use `elect:` for elect project-specific commits, omit for general/root commits
  - **Short Description**: One-line summary of what the commit fundamentally does
  - **Issue Reference**: Include `(#<issue-number>)` when working on an issue
  - **Extended Body**: Use extended git comment format (blank line, then bullet points or details)
  - **Example**:
    ```
    🦾 elect: Fix tab highlighting to ensure only one active tab (#123)
    
    - Use exact path matching for ballot tabs instead of startsWith
    - Fix badge calculation to correctly exclude unranked candidates
    - Ensure Summary and Results tabs use consistent active state logic
    ```
- **GitHub Issue References**: 
  - **Multiple Commits**: All commits in a chain (refactor, utilities, feature) should reference the issue: `🦾 elect: Refactor component structure (#123)`
  - **Final Commit**: Use `Resolves #123` in the final commit to automatically close the issue when merged: `🦾 elect: Resolves #123 - Implement logout functionality`
  - See `docs/GITHUB_ISSUES_WORKFLOW.md` for complete workflow details

### 2. Verification and Testing

- **Always Verify Compilation**: Before declaring work complete, verify:
  - TypeScript compilation: `pnpm tsc --noEmit` (or equivalent)
  - Build succeeds: `pnpm vite build` (or equivalent build command)
  - No linter errors
- **Test Before Committing**: The user explicitly stated: "In future can you verify that it builds before you tell me it is ready."
- **Incremental Testing**: When working on multiple issues, test each fix before moving to the next.

### 3. Error Handling and Robustness

- **Graceful Degradation**: Algorithm failures should not prevent basic vote statistics from being displayed.
- **Concise Error Messages**: Error messages should be concise and non-redundant. Avoid verbose or repetitive phrasing.
- **User-Friendly Messages**: Error messages should be in layperson terms, not technical jargon.
- **Silent Expected Failures**: Expected algorithm failures (e.g., no votes, invalid input) should fail silently without warnings. Only log unexpected throws with context (election identifier, ballot title).

### 4. Code Organization

- **Component Extraction**: Large components should be refactored into smaller, reusable modules.
- **Constants Extraction**: Shared constants should be moved to dedicated files (e.g., `constants.ts`).
- **Utility Functions**: Helper functions should be consolidated into utility files (e.g., `utils.tsx`).
- **Documentation Location**: All documentation (except main README) should be in `docs/` subdirectories under each app/server, not in root directories.

### 5. State Management and Persistence

- **Single Source of Truth**: Redux state is the single source of truth. Components should read from Redux selectors, never directly from sessionStorage.
- **Middleware for Side Effects**: Side effects (like sessionStorage persistence) should be handled by middleware, not reducers.
- **Session Storage Pattern**:
  - Single JSON entry (`election_session`) matching the session-persisted state structure exactly
  - Middleware writes the complete session-persisted subset in one operation
  - Slice initialization reads from the single JSON entry
  - Components never access sessionStorage directly

### 6. UI/UX Principles

- **User Experience First**: Consider the user's perspective when implementing features.
- **Accessibility**: Ensure interactive elements are keyboard accessible (e.g., Enter key support, autoFocus).
- **Visual Feedback**: Provide clear visual indicators for state changes (badges, colors, etc.).
- **Consistent Styling**: Use styled-components for consistent styling patterns.

## Proposals vs. Direct Implementation

### When User Asks for Proposals/Options

- Present multiple options with pros/cons
- Wait for user selection before implementing
- Examples: Design options, architectural choices, implementation approaches

### When User Asks for Direct Implementation/Fixes

- Implement directly without asking for approval
- Follow incremental commit pattern
- Verify compilation/build before declaring complete
- Test each fix before moving to the next issue

**Question**: Are there specific phrases or contexts that indicate the user wants proposals vs. direct implementation?

## GitHub Issues and Discussions Integration

- **Issue References**: When working on a GitHub issue, reference it in all related commits: `🦾 [project-prefix]: <description> (#<issue-number>)`
- **Closing Issues**: Use `Resolves #123` in the final commit to automatically close the issue when merged to default branch
- **Working on Existing Issues**: When directed to an issue number (e.g., "Work on #123"), acknowledge it and reference in all commits
- **Issue Creation**: If GitHub token is provided, I will create issues directly when requested. Otherwise, I'll draft issue content for you to create manually
- **Discussions**: If you say something is "for discussion", I will create a GitHub Discussion in `therious/lab` project rather than committing to project documentation prematurely
- **Token Usage**: When token is provided, I will use it to create/update issues and discussions as requested
- **See**: `docs/GITHUB_ISSUES_WORKFLOW.md` for complete workflow details

## Uncertainties and Questions

1. **Commit Message Prefix**: Should we standardize on a specific prefix format (e.g., `elect:`, `feat:`, `fix:`, `refactor:`)?
2. **Proposal Indicators**: What specific language indicates the user wants proposals vs. direct implementation?
3. **Testing Scope**: Should unit tests be written for new features, or is compilation/build verification sufficient?
4. **Documentation Updates**: When should documentation be updated? Always, or only when explicitly requested?
5. **Error Logging**: What level of detail should be logged for unexpected errors? Full stack traces or simplified messages?

## Anti-Patterns to Avoid

- ❌ Bundling multiple unrelated changes in one commit
- ❌ Committing without verifying compilation/build
- ❌ Accessing sessionStorage directly from components
- ❌ Implementing features before necessary refactoring/utilities
- ❌ Verbose or redundant error messages
- ❌ Logging warnings for expected algorithm failures
- ❌ Forgetting to check for compilation errors before declaring work complete
- ❌ **Committing to detached HEAD instead of checking current branch first**
- ❌ **Not verifying which worktree you're in before committing**

## Contract Review Protocol

**Before making fundamental changes to project structure, file organization, or context mechanisms:**
1. **Read this contract** - Review relevant sections before making changes
2. **Check `.gitignore`** - Verify what should/shouldn't be committed
3. **Review established patterns** - Understand why things are structured as they are
4. **If uncertain, ask** - Don't assume; verify before changing fundamental aspects

**The discussions folder (`docs/discussions/`) is PRIVATE and LOCAL-ONLY:**
- It is in `.gitignore` and should NEVER be committed
- It's for local context recovery, not version control
- Always verify `.gitignore` before committing discussion-related files

## Git Worktree and Branch Management

**CRITICAL: Always verify git state before committing:**
1. **Check current worktree** - Use `git rev-parse --show-toplevel` or check workspace path to know which worktree you're in
2. **Check current branch** - Use `git branch --show-current` or `git status` to verify you're on a branch, NOT in detached HEAD
3. **Use the current branch** - Always commit to the branch that's currently checked out in the worktree
4. **Never commit to detached HEAD** - If you find yourself in detached HEAD state, either:
   - Checkout the appropriate branch first: `git checkout <branch-name>`
   - Or create a branch from current HEAD: `git checkout -b <branch-name>`
   - Then commit to that branch
5. **Verify before each commit** - Run `git status` before committing to ensure you're on the correct branch

**If you accidentally commit to detached HEAD:**
- The commits are still valid, but they need to be merged into a branch
- Use `git update-ref refs/heads/<branch-name> <commit-hash>` to move the branch pointer
- Or merge the detached HEAD commits into the target branch from another worktree

## Session Initialization and Context Recovery

**At the start of each new session, follow this recovery process to restore context and understanding:**

### Step 1: Read Core Documentation
1. **Read `docs/VibeCodingContract.md`** (this file) - Understand coding principles and patterns
2. **Read `docs/README.md`** - Understand project overview
3. **Read `docs/topics/lab-intro.md`** - Understand project structure and purpose

### Step 2: Review Recent Work
1. **Check git log** - Review recent commits to understand what was being worked on:
   ```bash
   git log --oneline -20
   ```
2. **Check git status** - See what files are modified:
   ```bash
   git status
   ```
3. **Review recent changes** - Understand what was changed:
   ```bash
   git diff HEAD
   ```

### Step 3: Review Discussion Documents
1. **Read discussion documents in date order** (newest first):
   - Location: `docs/discussions/`
   - Format: `YYYY-MM-DD-topic-name.md`
   - These capture important decisions, design discussions, and context
2. **Review project-specific docs**:
   - `apps/elect/docs/` - Elect UI app documentation
   - `servers/elections/docs/` - Elections server documentation

### Step 4: Check GitHub Issues and Discussions
1. **Review open GitHub Issues** - See what's being worked on
2. **Review recent GitHub Discussions** - See design decisions and discussions
3. **Check for issue references in commits** - Understand what issues were addressed

### Step 5: Understand Current State
1. **Read relevant code files** - Understand current implementation
2. **Check for uncommitted changes** - See what's in progress
3. **Review error logs** - If there were errors, understand what failed

### Step 6: Verify Understanding
Before declaring readiness, verify:
- ✅ Understand what project/app you're working on
- ✅ Understand recent changes and current state
- ✅ Understand any open issues or tasks
- ✅ Understand coding principles from contract
- ✅ Ready to continue where work left off

### Context Preservation
- **Code** - Documents what was built
- **VibeCodingContract.md** - Documents how we work
- **Discussion docs** (`docs/discussions/`) - Documents important decisions and context
- **GitHub Issues** - Documents what's being worked on
- **GitHub Discussions** - Documents design decisions
- **Project docs** - Documents project-specific patterns

**SpecStory is disabled** - We rely on the above sources for context, not SpecStory markdown files.

---

*Last Updated: Added context recovery instructions and discussion docs structure*

