# Context Preservation Strategy

This document outlines how we preserve development context without relying on SpecStory (which can cause IDE performance issues).

## Problem

SpecStory saves large markdown files of AI interactions in `.specstory/history/`, which can:
- Cause IDE freezing when workspace contains large session files
- Create performance issues
- Potentially expose sensitive information if committed

## Solution: Multi-Layered Context Preservation

We preserve context through multiple sources that work together:

### 1. Repository Source Code

**What it preserves**: The actual implementation, code structure, patterns, and decisions

**How to restore context**:
- Read the code - it documents what was built
- Review commit history - shows incremental development
- Check file structure - shows organization decisions

**Strengths**:
- Always up-to-date
- Shows final decisions, not just discussions
- Self-documenting through code structure

**Limitations**:
- Doesn't capture "why" decisions were made
- Doesn't show rejected alternatives
- Doesn't document discussions

### 2. VibeCodingContract.md

**What it preserves**: Coding principles, rules, patterns, and expectations

**How to restore context**:
- Review contract at start of each session
- Documents incremental commit patterns
- Captures error handling approaches
- Records state management patterns
- Documents UI/UX principles

**Strengths**:
- Captures "how we work" principles
- Documents patterns and anti-patterns
- Living document that evolves

**Limitations**:
- Doesn't capture specific feature discussions
- Doesn't document "why" specific decisions were made

### 3. Workflow Documentation

**What it preserves**: Process documentation, workflows, and procedures

**Files**:
- `docs/GITHUB_ISSUES_WORKFLOW.md` - Issue and discussion workflow
- `docs/BRANCH_MERGE_AND_PURGE_PLAN.md` - Branch management procedures
- `docs/SPECSTORY_PURGE_OPTIONS.md` - Historical reference
- Project-specific docs in `apps/*/docs/` and `servers/*/docs/`

**How to restore context**:
- Review relevant workflow docs
- Understand established procedures
- See historical decisions

**Strengths**:
- Documents processes and procedures
- Captures architectural decisions
- Provides step-by-step guides

**Limitations**:
- Doesn't capture real-time discussions
- May not cover edge cases

### 4. GitHub Issues

**What it preserves**: Feature requests, bug reports, implementation discussions, decisions

**How to restore context**:
- Read issue descriptions and comments
- Review linked PRs and commits
- See discussion threads
- Check issue labels and milestones

**Strengths**:
- Captures "why" decisions were made
- Shows discussion and alternatives
- Links to code via commits
- Searchable and organized

**Limitations**:
- Requires discipline to create issues for discussions
- May not capture all informal discussions

### 5. GitHub Discussions

**What it preserves**: Open-ended discussions, design decisions, proposals, questions

**How to restore context**:
- Review discussion threads
- See proposals and alternatives
- Understand design rationale
- Find answers to questions

**Strengths**:
- Captures exploratory discussions
- Documents design decisions
- Shows rejected alternatives
- Community knowledge base

**Limitations**:
- Requires creating discussions for "for discussion" items
- May not be as searchable as issues

## Context Restoration Workflow

When starting a new session or returning to work:

1. **Review VibeCodingContract.md** - Understand coding principles
2. **Check GitHub Issues** - See what's being worked on
3. **Review Recent Commits** - Understand recent changes
4. **Read Relevant Documentation** - Understand established patterns
5. **Check GitHub Discussions** - See design decisions and discussions
6. **Review Code** - Understand current implementation

## Best Practices for Context Preservation

### For Feature Development

1. **Create GitHub Issue** - Document the feature request
2. **Use Discussions for Design** - If design needs discussion, create a discussion
3. **Reference in Commits** - Link commits to issues
4. **Update Documentation** - If patterns change, update VibeCodingContract or workflow docs
5. **Write Self-Documenting Code** - Code should explain itself

### For Bug Fixes

1. **Create GitHub Issue** - Document the bug
2. **Reference in Commits** - Link fix commits to issue
3. **Document Root Cause** - In issue comments if non-obvious

### For Architectural Decisions

1. **Create GitHub Discussion** - Document the decision
2. **Update Documentation** - Add to relevant docs
3. **Reference in Code** - Add comments explaining architectural choices

### For "For Discussion" Items

1. **Create GitHub Discussion** - Don't commit to docs prematurely
2. **Link from Issues** - If discussion leads to implementation, link issue to discussion
3. **Update Docs After Decision** - Once decided, update documentation

## Is This Sufficient?

**Yes, with discipline:**

✅ **Code + Docs + Issues + Discussions** provide comprehensive context:
- **What was built** → Code
- **How we work** → VibeCodingContract + Workflow docs
- **Why decisions were made** → GitHub Issues + Discussions
- **What's being worked on** → GitHub Issues
- **Design discussions** → GitHub Discussions

**Key Requirements**:
1. Create issues for features/bugs (not just work directly)
2. Create discussions for "for discussion" items
3. Reference issues in commits
4. Update documentation when patterns change
5. Write self-documenting code

## Disabling SpecStory

To prevent IDE freezing and rely on this strategy:

1. **Disable SpecStory in Cursor/VSCode**:
   - Settings → Search "SpecStory"
   - Disable "Auto Save"
   - Or disable the extension entirely

2. **Remove .specstory from workspace**:
   - Already in `.gitignore`
   - Can be deleted locally (won't affect git)

3. **Use GitHub for context**:
   - Create issues for work items
   - Create discussions for design questions
   - Reference in commits

## Migration from SpecStory

If you have existing SpecStory files with valuable context:

1. **Review .specstory/history/** - Identify valuable discussions
2. **Create GitHub Issues/Discussions** - Extract key decisions
3. **Update Documentation** - Add patterns to VibeCodingContract
4. **Delete .specstory** - After migration complete

---

*This strategy provides better organization, searchability, and collaboration than local markdown files.*

