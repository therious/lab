# Claude Sonnet Analysis Setup & Payment Guide

## Quick Start

### 1. Install Dependencies

```bash
cd apps/roots
pnpm install
```

This will install `@anthropic-ai/sdk` which is required for the Claude API.

### 2. Get Your Anthropic API Key

1. **Sign up for Anthropic account**: Go to https://console.anthropic.com/
2. **Create API key**: 
   - Navigate to "API Keys" in the console
   - Click "Create Key"
   - Copy the key (you'll only see it once!)
3. **Set up billing**: 
   - Go to "Billing" in the console
   - Add a payment method (credit card)
   - Set up usage limits if desired (recommended!)

### 3. Set API Key

**Option A: Environment Variable (Recommended)**
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Option B: Command Line**
```bash
npx tsx src/roots/analyze-meanings-claude.ts --api-key sk-ant-api03-...
```

### 4. Run Dry-Run First (No Cost)

```bash
npx tsx src/roots/analyze-meanings-claude.ts --dry-run
```

This shows you:
- Exact number of pairs to analyze (2,972)
- Estimated cost (~$2.18)
- No API calls are made

### 5. Run Analysis

**With budget limit (recommended):**
```bash
npx tsx src/roots/analyze-meanings-claude.ts --max-cost 5.00
```

**Without budget limit:**
```bash
npx tsx src/roots/analyze-meanings-claude.ts --yes
```

## Payment & Billing

### How Payment Works

1. **Pay-as-you-go**: You're charged per API call based on token usage
2. **Automatic billing**: Charges appear on your credit card
3. **Usage tracking**: Check your usage in the Anthropic console

### Cost Breakdown

- **Input tokens**: $3.00 per 1 million tokens
- **Output tokens**: $15.00 per 1 million tokens
- **Estimated cost for 2,972 pairs**: ~$2.18

### Setting Usage Limits

**Recommended**: Set a usage limit in Anthropic console to prevent unexpected charges:

1. Go to https://console.anthropic.com/settings/limits
2. Set a monthly or per-request limit
3. The script also has `--max-cost` flag as an additional safeguard

### Cost Protection

The script includes multiple safeguards:

1. **`--max-cost` flag**: Hard stop at your specified limit
2. **Checkpoint system**: Progress saved, can resume without duplicate charges
3. **Dry-run mode**: See exact costs before spending
4. **Real-time tracking**: Shows running costs as it executes

## Output

The script generates a new file: `definition-similarity-grades-claude.ts`

This file:
- Uses the **same format** as the existing grades file
- Can **replace** the existing file if desired
- Contains only letter-based connections (2,972 pairs)
- Includes all grades (0-5), but only stores grades > 0

## Usage Examples

### Example 1: Safe First Run
```bash
# 1. Dry-run to see costs
npx tsx src/roots/analyze-meanings-claude.ts --dry-run

# 2. Run with small budget to test
npx tsx src/roots/analyze-meanings-claude.ts --max-cost 1.00

# 3. If satisfied, run full analysis
npx tsx src/roots/analyze-meanings-claude.ts --max-cost 5.00
```

### Example 2: Resume After Stopping
```bash
# If script stops (Ctrl+C, budget limit, etc.)
# Resume from checkpoint:
npx tsx src/roots/analyze-meanings-claude.ts --resume --max-cost 5.00
```

### Example 3: Custom Output Location
```bash
npx tsx src/roots/analyze-meanings-claude.ts \
  --output ./my-grades.ts \
  --max-cost 5.00
```

## Replacing Existing Grades

After the script completes, you have two options:

### Option 1: Keep Both Files
- Keep `definition-similarity-grades.ts` (original, all pairs)
- Use `definition-similarity-grades-claude.ts` (Claude analysis, letter-based only)
- Modify code to use the Claude version for letter-based connections

### Option 2: Merge Results
- The Claude results can be merged with existing grades
- Script can be modified to update existing grades file
- Or manually merge the two files

## Troubleshooting

### "ANTHROPIC_API_KEY not set"
- Set environment variable: `export ANTHROPIC_API_KEY=your_key`
- Or use `--api-key` flag

### "Budget limit reached"
- Script stops automatically
- Use `--resume` to continue with higher budget
- Or adjust `--max-cost` value

### "Rate limit error"
- Script includes automatic retry with backoff
- If persistent, reduce batch size in code (currently 10)

### Checkpoint Issues
- Checkpoints saved in `./checkpoints/checkpoint.json`
- Can manually inspect/edit if needed
- Delete checkpoint file to start fresh

## Cost Estimates

| Scenario | Pairs | Estimated Cost |
|----------|-------|----------------|
| Letter-based connections | 2,972 | ~$2.18 |
| With 20% buffer | 2,972 | ~$2.62 |
| With 50% buffer | 2,972 | ~$3.27 |

**Note**: Actual costs may vary ±10-20% based on actual token usage.

## Next Steps

1. ✅ Install dependencies: `pnpm install`
2. ✅ Get API key from https://console.anthropic.com/
3. ✅ Set up billing in Anthropic console
4. ✅ Run dry-run: `npx tsx src/roots/analyze-meanings-claude.ts --dry-run`
5. ✅ Run with budget: `npx tsx src/roots/analyze-meanings-claude.ts --max-cost 5.00`
6. ✅ Review output file
7. ✅ Integrate results into codebase

