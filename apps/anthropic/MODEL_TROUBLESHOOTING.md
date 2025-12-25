# Model Name Troubleshooting

If you're getting `404 not_found_error` for the model, try these solutions:

## Solution 1: Use the --model flag

Try different model names:

```bash
# Try the 20240620 version
npx tsx src/fetch-dictionary-definitions.ts --model claude-3-5-sonnet-20240620 --max-cost 1.00

# Or try without date
npx tsx src/fetch-dictionary-definitions.ts --model claude-3-5-sonnet --max-cost 1.00

# Or try Opus
npx tsx src/fetch-dictionary-definitions.ts --model claude-3-opus-20240229 --max-cost 1.00
```

## Solution 2: Check Your API Key Permissions

Your API key might not have access to certain models. Check:
- https://console.anthropic.com/settings/keys
- Make sure your key has access to the model you're trying to use

## Solution 3: Check Available Models

Visit: https://docs.anthropic.com/en/docs/models-overview

Common model names:
- `claude-3-5-sonnet-20240620` (most common)
- `claude-3-5-sonnet` (latest, if supported)
- `claude-3-opus-20240229`
- `claude-3-haiku-20240307`

## Solution 4: Update the Default Model

Edit the script and change the `CLAUDE_MODEL` constant to a model that works for your API key.

