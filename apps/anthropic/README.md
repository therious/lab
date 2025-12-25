# Anthropic Analysis App

This is a **standalone app** for analyzing Hebrew root definition similarities using Claude Sonnet AI. It is completely separate from the `roots` app and can be discarded or retooled after generating the grades file.

## Purpose

This app provides two main capabilities:

1. **Similarity Analysis**: Generate AI-powered similarity grades for Hebrew root definitions that are connected by letter-based rules (mischalfim, gutturals, palatals, etc.).

2. **Dictionary Lookup**: Fetch comprehensive Hebrew dictionary definitions for each root, including words with vowels (nikud) and their English meanings.

## Outputs

### 1. Similarity Grades

**File**: `definition-similarity-grades-claude.ts`

- Uses the **exact same format** as the existing grades file in the roots app
- Can be **directly copied** to replace `apps/roots/src/roots/definition-similarity-grades.ts`
- Contains grades for all letter-based connections (~2,972 pairs)

### 2. Dictionary Definitions

**File**: `root-dictionary-definitions.json`

- JSON file with Hebrew words (with vowels/nikud) for each root
- English definitions for each word
- Part of speech information
- Ready to use in roots app for displaying related meanings

See `DICTIONARY_README.md` for details.

## Setup

### 1. Install Dependencies

```bash
cd apps/anthropic
pnpm install
```

### 2. Get Anthropic API Key

1. Sign up at https://console.anthropic.com/
2. Create API key in "API Keys" section
3. Set up billing (add credit card)

### 3. Set API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Usage

### Similarity Analysis

#### Step 1: Estimate Costs (No API Calls)

```bash
# Estimate cost for letter-based connections
pnpm run estimate

# Or see all estimation scenarios
pnpm run estimate-all
```

#### Step 2: Dry-Run (No API Calls)

```bash
npx tsx src/analyze-meanings-claude.ts --dry-run
```

#### Step 3: Run Analysis

```bash
# With budget limit (recommended)
npx tsx src/analyze-meanings-claude.ts --max-cost 5.00

# Or use the script shortcut
pnpm run analyze -- --max-cost 5.00
```

#### Step 4: Copy Output to Roots App

```bash
cp src/definition-similarity-grades-claude.ts ../roots/src/roots/definition-similarity-grades.ts
```

### Dictionary Lookup

#### Step 1: Estimate Costs

```bash
npx tsx src/fetch-dictionary-definitions.ts --dry-run
```

#### Step 2: Run Lookup

```bash
# With budget limit (recommended)
npx tsx src/fetch-dictionary-definitions.ts --max-cost 50.00

# Or use the script shortcut
pnpm run dictionary -- --max-cost 50.00
```

#### Step 3: Copy Output to Roots App

```bash
cp src/root-dictionary-definitions.json ../roots/src/roots/
```

See `DICTIONARY_README.md` for detailed documentation.

## Cost

- **Estimated cost**: ~$2.18 for all 2,972 letter-based connections
- **With buffer**: ~$3.00 recommended budget

## Features

- ✅ Budget limits (`--max-cost`)
- ✅ Dry-run mode (`--dry-run`)
- ✅ Checkpoint/resume (`--resume`)
- ✅ Real-time cost tracking
- ✅ Automatic progress saving

## Files

- `src/analyze-meanings-claude.ts` - Main analysis script
- `src/estimate-letter-connections-cost.ts` - Cost estimation
- `src/estimate-ai-cost.ts` - Full cost scenarios
- `src/roots.js` - Copy of roots data (needed for analysis)
- `src/mischalfim.ts` - Copy of mischalfim data (needed for analysis)
- `docs/` - Documentation files

## Cleanup

After generating the grades file, you can:

1. **Keep the app** - For future analysis or different tasks
2. **Delete the app** - All you need is the output file
3. **Retool it** - Modify for other AI analysis tasks

The roots app has **no dependency** on this app - it only needs the final grades file.

## Important Notes

- This app is **completely independent** from the roots app
- No code from this app is used in the roots app
- Only the **output file** is copied to roots app
- All AI-related code stays in this app
- Roots app remains unchanged except for the grades data file

