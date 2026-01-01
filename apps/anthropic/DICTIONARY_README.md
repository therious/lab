# Hebrew Dictionary Definition Fetcher

This script uses Claude Sonnet to retrieve comprehensive Hebrew dictionary definitions for each root, including words with vowels (nikud) and their English meanings.

## Purpose

For each Hebrew root, fetch:
- Hebrew words (with full vowels/nikud) derived from the root
- English definitions for each word
- Part of speech information
- Usage context when relevant

## Output Format

The script generates a JSON file with this structure:

```json
{
  "metadata": {
    "generated": "2024-12-22T...",
    "totalRoots": 1995,
    "model": "claude-3-5-sonnet-20241022",
    "description": "Hebrew dictionary definitions for roots..."
  },
  "roots": [
    {
      "id": 1,
      "root": "אבב",
      "currentDefinition": "ripen; greedily absorb nourishment from the ground",
      "words": [
        {
          "hebrew": "אָב",
          "english": "father",
          "partOfSpeech": "noun",
          "context": "common term for father"
        },
        {
          "hebrew": "אָבָה",
          "english": "to want, to be willing",
          "partOfSpeech": "verb"
        }
      ]
    }
  ]
}
```

## Usage

### Step 1: Estimate Costs

```bash
# Dry-run to see costs (no API calls)
npx tsx src/fetch-dictionary-definitions.ts --dry-run
```

### Step 2: Run Lookup

```bash
# With budget limit (recommended)
npx tsx src/fetch-dictionary-definitions.ts --max-cost 50.00

# Or use the script shortcut
pnpm run dictionary -- --max-cost 50.00
```

### Step 3: Copy Output

After completion:

```bash
cp src/root-dictionary-definitions.json ../roots/src/roots/
```

## Options

- `--dry-run` - Show estimates without making API calls
- `--max-cost <amount>` - Maximum cost in USD (hard stop)
- `--checkpoint-dir <dir>` - Directory for checkpoint files (default: ./checkpoints)
- `--resume` - Resume from checkpoint
- `--api-key <key>` - Claude API key (or use ANTHROPIC_API_KEY env var)
- `--output <file>` - Output file path (default: root-dictionary-definitions.json)
- `--yes` - Skip confirmation prompt
- `--start-from <id>` - Start from specific root ID (useful for resuming)

## Cost Estimate

For ~2,000 roots:
- **Estimated input tokens**: ~500,000
- **Estimated output tokens**: ~1,000,000
- **Estimated cost**: ~$18.00

**Note**: Actual costs may vary based on:
- Number of words per root (varies significantly)
- Response length
- API pricing changes

## Features

✅ **Budget limits** - Hard stop at specified cost  
✅ **Dry-run mode** - See costs before spending  
✅ **Checkpoint/resume** - Save progress, resume later  
✅ **Real-time tracking** - Shows costs and progress  
✅ **Error handling** - Continues on individual failures  
✅ **Structured output** - JSON format ready for use  

## Integration with Roots App

After generating the file, you can:

1. **Copy to roots app**:
   ```bash
   cp root-dictionary-definitions.json ../roots/src/roots/
   ```

2. **Import in roots app**:
   ```typescript
   import dictionaryData from './root-dictionary-definitions.json';
   
   // Access definitions for a root
   const rootEntry = dictionaryData.roots.find(r => r.id === rootId);
   if (rootEntry) {
     rootEntry.words.forEach(word => {
       console.log(`${word.hebrew}: ${word.english}`);
     });
   }
   ```

3. **Display in UI**: Use the data to show related words and meanings for each root

## Example Workflow

```bash
# 1. See costs (no API calls)
npx tsx src/fetch-dictionary-definitions.ts --dry-run

# 2. Test with small budget
npx tsx src/fetch-dictionary-definitions.ts --max-cost 5.00

# 3. Review results, then run full lookup
npx tsx src/fetch-dictionary-definitions.ts --max-cost 50.00

# 4. If interrupted, resume
npx tsx src/fetch-dictionary-definitions.ts --resume --max-cost 50.00

# 5. Copy output
cp src/root-dictionary-definitions.json ../roots/src/roots/
```

## Output File Location

Default: `src/root-dictionary-definitions.json`

You can specify a custom location:
```bash
npx tsx src/fetch-dictionary-definitions.ts --output ./my-dictionary.json
```

## Notes

- Each root typically returns 5-10 words
- Hebrew words include full vowels (nikud)
- Definitions are in English
- Part of speech is included when relevant
- The script handles JSON parsing errors gracefully
- Failed roots are logged but don't stop the process

