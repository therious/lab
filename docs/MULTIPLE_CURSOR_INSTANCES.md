# Managing Multiple Cursor Instances and Contexts

This document explains how to work with multiple Cursor instances across different projects/worktrees while maintaining context.

## Understanding Cursor's Context System

### How Cursor Stores Context

Cursor stores context in **two places**:

1. **Workspace-specific context** (per Cursor window):
   - Chat history for that specific workspace
   - @ references to files in that workspace
   - Code context from open files
   - Stored in Cursor's SQLite database (per workspace)

2. **Global Cursor settings**:
   - Extension settings
   - User preferences
   - Stored in `~/Library/Application Support/Cursor/` (macOS)

### Multiple Cursor Instances

When you open multiple Cursor windows:
- Each window has its **own chat history**
- Each window has its **own context** (files, folders, code)
- Context is **not shared** between windows by default
- Each window is **workspace-specific**

## Working with Multiple Projects

### Scenario: 2-3 Projects Simultaneously

**Setup**:
- **Cursor Window 1**: `/Users/hzamir/work/lab` (main worktree)
- **Cursor Window 2**: `/Users/hzamir/work/lab-a` (worktree, scrappy branch)
- **Cursor Window 3**: `/Users/hzamir/work/lab-b` (worktree, elect-ui branch)

### How Context Works Per Window

**Each Cursor window maintains**:
- ✅ Chat history for that workspace
- ✅ @ references to files in that workspace
- ✅ Code context from open files
- ✅ Previous chats in that workspace

**Context is NOT shared** between windows, which is actually **beneficial**:
- Each project has isolated context
- No confusion between projects
- Faster (smaller context per window)
- Clear separation of concerns

## Retrieving Context in Each Window

### Method 1: Chat History (Built-in)

**In each Cursor window**:
1. Open Chat panel (Cmd+L or Ctrl+L)
2. View chat history in sidebar
3. Previous chats are available per workspace
4. Click on previous chat to see context

**Pros**:
- Already available
- No setup needed
- Fast access
- Workspace-specific

**Limitations**:
- Only shows chats from that workspace
- Not searchable across workspaces

### Method 2: @ References (Built-in)

**In any Cursor window**:
- `@filename` - Reference specific file
- `@foldername` - Reference entire folder
- `@code` - Reference selected code
- `@GitHub` - Reference GitHub issues/discussions (if configured)

**Pros**:
- Works across all windows
- Fast and intuitive
- No setup needed

### Method 3: GitHub Issues/Discussions

**For cross-project context**:
1. Create GitHub Issues for features/bugs
2. Create Discussions for design decisions
3. Reference issues in commits: `🦾 elect: Description (#123)`
4. Access from any Cursor window via @GitHub (if configured)

**Pros**:
- Searchable across all projects
- Organized and persistent
- Accessible from any window
- Better than SpecStory markdown files

### Method 4: VibeCodingContract.md

**For coding principles**:
- Located at project root: `docs/VibeCodingContract.md`
- Contains coding principles and patterns
- Reference with: `@docs/VibeCodingContract.md`
- Works from any window in that workspace

**Pros**:
- Consistent principles across sessions
- Easy to reference
- Version controlled

### Method 5: Code + Documentation

**Self-documenting code**:
- Code structure shows decisions
- Comments explain "why"
- Documentation in `docs/` folders
- Commit history shows evolution

**Pros**:
- Always up-to-date
- Shows final decisions
- Accessible from any window

## Best Practices for Multiple Instances

### 1. Organize by Project/Worktree

**One Cursor window per worktree**:
- `lab` → Main worktree window
- `lab-a` → Worktree A window (scrappy branch)
- `lab-b` → Worktree B window (elect-ui branch)

**Benefits**:
- Clear separation
- Isolated context
- No confusion

### 2. Use GitHub for Cross-Project Context

**When context needs to span projects**:
- Create GitHub Issue/Discussion
- Reference in commits
- Access from any window

**Example**:
- Working on `elect-ui` but need context from `scrappy`?
- Check GitHub Issues/Discussions
- Or create a discussion linking both projects

### 3. Reference Shared Documentation

**For principles and patterns**:
- `@docs/VibeCodingContract.md` - Coding principles
- `@docs/GITHUB_ISSUES_WORKFLOW.md` - Workflow
- `@docs/CONTEXT_PRESERVATION_STRATEGY.md` - Context strategy

**Works from any window** in that workspace.

### 4. Use Chat History Per Window

**Each window maintains its own history**:
- Previous chats available in sidebar
- Click to restore context
- Workspace-specific (no cross-contamination)

### 5. Create Project-Specific Documentation

**For project-specific context**:
- `apps/elect/docs/` - Elect-specific docs
- `servers/elections/docs/` - Server-specific docs
- Reference with `@docs/filename.md`

## Workflow Example

### Starting Work on elect-ui (lab-b)

1. **Open Cursor window** for `/Users/hzamir/work/lab-b`
2. **Review chat history** in that window (if any)
3. **Reference principles**: `@docs/VibeCodingContract.md`
4. **Check GitHub Issues**: Look for elect-ui related issues
5. **Reference code**: `@apps/elect/src/App.tsx`
6. **Start chatting** - context is workspace-specific

### Switching to scrappy (lab-a)

1. **Switch to Cursor window** for `/Users/hzamir/work/lab-a`
2. **Different chat history** (workspace-specific)
3. **Same principles**: `@docs/VibeCodingContract.md` (if in same repo)
4. **Different code context**: `@apps/scrappy/...`
5. **Previous chats** from lab-a window available

### Sharing Context Between Projects

**If you need context from another project**:

1. **GitHub Issues/Discussions**:
   - Create issue/discussion linking both projects
   - Reference from any window

2. **Documentation**:
   - Document cross-project decisions in root `docs/`
   - Reference from any window

3. **Code References**:
   - If projects share code (libs/), reference shared code
   - `@libs/utils/` works from any window

## Disabling SpecStory

**After archiving SpecStory files**:

1. **Disable SpecStory extension**:
   - Settings → Extensions → SpecStory → Disable
   - Or: Settings → Search "SpecStory" → Disable

2. **Remove .specstory directories** (optional):
   ```bash
   rm -rf /Users/hzamir/work/lab/.specstory
   rm -rf /Users/hzamir/work/lab-a/.specstory
   rm -rf /Users/hzamir/work/lab-b/.specstory
   ```

3. **Rely on Cursor's built-in context**:
   - Chat history per window
   - @ references
   - GitHub Issues/Discussions
   - Documentation

## Summary

**You don't need SpecStory for multiple contexts**:

✅ **Cursor's built-in system** provides:
- Chat history per workspace (window)
- @ references to files/folders/code
- Previous chats accessible in sidebar
- Fast SQLite-based storage

✅ **GitHub Issues/Discussions** provide:
- Cross-project context
- Searchable decisions
- Persistent organization

✅ **Documentation** provides:
- Principles (VibeCodingContract.md)
- Workflows (GITHUB_ISSUES_WORKFLOW.md)
- Project-specific docs

**Each Cursor window is isolated**, which is actually **beneficial** for working on multiple projects simultaneously.

---

*Multiple Cursor instances = multiple isolated contexts, which is exactly what you want when working on different projects.*

