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
- **Commit Message Format**: Use descriptive commit messages. The user has mentioned `git commit -m "elect: [message]"` format, though various prefixes have been used (e.g., `feat:`, `fix:`, `refactor:`). **Question**: Should we standardize on a specific prefix format?

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

## Session Initialization

**At the start of each new session, review this contract to ensure all principles are applied consistently.**

---

*Last Updated: Based on interactions through implementation of logout functionality and session storage middleware*

