/**
 * Hebrew Dictionary Definition Fetcher using Claude Sonnet
 * 
 * This script queries Claude Sonnet to retrieve Hebrew dictionary definitions
 * for each root, including:
 * - Hebrew words (with vowels/nikud) derived from the root
 * - English definitions for each word
 * - Part of speech information
 * 
 * Features:
 * - Budget limits (hard stop)
 * - Dry-run mode (no API calls)
 * - Checkpoint/resume system
 * - Real-time cost tracking
 * - Compact YAML output
 * 
 * Run with: npx tsx fetch-dictionary-definitions.ts [options]
 * 
 * Options:
 *   --dry-run              Show estimates without making API calls
 *   --max-cost <amount>    Maximum cost in USD (default: unlimited)
 *   --checkpoint-dir <dir> Directory for checkpoint files (default: ./checkpoints)
 *   --resume               Resume from checkpoint
 *   --api-key <key>        Claude API key (or use ANTHROPIC_API_KEY env var)
 *   --output <file>        Output file path (default: root-dictionary-definitions.yaml)
 *   --yes                  Skip confirmation prompt
 *   --start-from <id>      Start from specific root ID (for resuming)
 *   --model <name>         Claude model name (default: claude-sonnet-4-20250514)
 */

import Anthropic from '@anthropic-ai/sdk';
import { roots } from './roots.js';
import * as fs from 'fs';
import * as path from 'path';

// Types (compact format for YAML output)
interface DictionaryWord {
  /** Hebrew word with vowels (nikud) */
  h: string;
  /** English definition */
  e: string;
  /** Part of speech (noun, verb, adjective, etc.) */
  t?: string;
}

interface RootDictionaryEntry {
  /** Root ID */
  id: number;
  /** Root letters (P, E, L) */
  root: string;
  /** Current definition from roots.js */
  def: string;
  /** Dictionary words derived from this root */
  eg: DictionaryWord[];
}

interface Checkpoint {
  completed: RootDictionaryEntry[];
  remaining: Array<{ id: number; root: string; definition: string }>;
  totalCost: number;
  totalTokens: { input: number; output: number };
  startTime: string;
  lastUpdate: string;
}

// Configuration
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Correct model name for api03 keys
const CLAUDE_PRICING = {
  input: 3.00 / 1_000_000,   // $3 per 1M input tokens
  output: 15.00 / 1_000_000,  // $15 per 1M output tokens
};

/**
 * Fetch dictionary definitions for a single root
 */
async function fetchRootDefinitions(
  client: Anthropic,
  rootId: number,
  rootLetters: string,
  currentDefinition: string,
  modelName: string = CLAUDE_MODEL
): Promise<{ entry: RootDictionaryEntry; inputTokens: number; outputTokens: number }> {
  const prompt = `You are an expert in biblical and classical Hebrew. For the Hebrew root ${rootLetters} (root ID: ${rootId}), provide ONLY words that are genuinely derived from this root.

Current definition: "${currentDefinition}"

CRITICAL REQUIREMENTS:
1. Only include words where the root letters ${rootLetters} actually appear in the word's morphological structure (conjugation, derivation, etc.)
2. EXCLUDE all foreign loanwords (e.g., בלגיה/Belgium, בלוגר/blogger) - these are NOT derived from Hebrew roots
3. EXCLUDE words that merely contain the root letters by coincidence
4. Prioritize biblical/classical Hebrew words, but include modern Hebrew words IF they are genuinely derived from this root
5. The word must be a real Hebrew word, not a foreign word that happens to contain these letters

Focus on:
- Biblical Hebrew words (Tanakh/Torah)
- Classical Hebrew words (Mishnah, Talmud)
- Modern Hebrew words ONLY if they are actual derivations of this root (not loanwords)

Provide:
- Hebrew words with full vowels (nikud)
- English definitions
- Part of speech when relevant

Format your response as a JSON array of objects, each with:
- "hebrew": the Hebrew word with vowels (in Hebrew script)
- "english": the English definition
- "partOfSpeech": optional part of speech (omit if not relevant)

Example format:
[
  {
    "hebrew": "אָב",
    "english": "father",
    "partOfSpeech": "noun"
  },
  {
    "hebrew": "אָבָה",
    "english": "to want, to be willing",
    "partOfSpeech": "verb"
  }
]

Return ONLY valid JSON, no additional text or explanation.`;

  const message = await client.messages.create({
    model: modelName,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Safely extract response text
  let responseText = '';
  if (message.content && message.content.length > 0) {
    const firstContent = message.content[0];
    if (firstContent.type === 'text') {
      responseText = firstContent.text.trim();
    }
  }
  
  // Parse JSON response
  let words: DictionaryWord[] = [];
  try {
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\[.*?\])\s*```/s);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
    
    words = JSON.parse(jsonText);
    
    // Validate structure
    if (!Array.isArray(words)) {
      throw new Error('Response is not an array');
    }
    
    // Validate each word has required fields and transform to compact format
    words = words
      .filter(w => w.hebrew && w.english)
      .map(w => ({
        h: w.hebrew,
        e: w.english,
        ...(w.partOfSpeech ? { t: w.partOfSpeech } : {}),
      }));
  } catch (error: any) {
    console.warn(`⚠️  Failed to parse JSON for root ${rootId}: ${error.message}`);
    if (responseText) {
      console.warn(`   Response: ${responseText.substring(0, 200)}...`);
    } else {
      console.warn(`   No response text received`);
    }
    // Return empty array on parse error
    words = [];
  }
  
  // Ensure words is always an array
  if (!Array.isArray(words)) {
    words = [];
  }

  const entry: RootDictionaryEntry = {
    id: rootId,
    root: rootLetters,
    def: currentDefinition,
    eg: words,
  };

  const inputTokens = message.usage?.input_tokens || 0;
  const outputTokens = message.usage?.output_tokens || 0;

  return { entry, inputTokens, outputTokens };
}

/**
 * Load checkpoint
 */
function loadCheckpoint(checkpointDir: string): Checkpoint | null {
  const checkpointPath = path.join(checkpointDir, 'dictionary-checkpoint.json');
  if (!fs.existsSync(checkpointPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(checkpointPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Failed to load checkpoint: ${error}`);
    return null;
  }
}

/**
 * Save checkpoint
 */
function saveCheckpoint(
  checkpointDir: string,
  completed: RootDictionaryEntry[],
  remaining: Array<{ id: number; root: string; definition: string }>,
  totalCost: number,
  totalTokens: { input: number; output: number },
  startTime: string
): void {
  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true });
  }

  const checkpoint: Checkpoint = {
    completed,
    remaining,
    totalCost,
    totalTokens,
    startTime,
    lastUpdate: new Date().toISOString(),
  };

  const checkpointPath = path.join(checkpointDir, 'dictionary-checkpoint.json');
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8');
}

/**
 * Estimate cost for dry-run
 */
function estimateCost(totalRoots: number): {
  totalRoots: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
} {
  // Estimate tokens per root
  const promptOverhead = 200; // Base prompt
  const avgDefinitionLength = 50; // Average current definition length
  const estimatedInputTokens = Math.ceil((promptOverhead + avgDefinitionLength) * totalRoots);
  const estimatedOutputTokens = totalRoots * 500; // Average response size

  const estimatedCost =
    estimatedInputTokens * CLAUDE_PRICING.input + estimatedOutputTokens * CLAUDE_PRICING.output;

  return {
    totalRoots,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCost,
  };
}

/**
 * Escape YAML string value (only quote if necessary)
 */
function escapeYamlString(value: string): string {
  // Check if quoting is needed
  const needsQuotes = 
    value.includes(':') ||
    value.includes('|') ||
    value.includes('&') ||
    value.includes('*') ||
    value.includes('#') ||
    value.includes('?') ||
    value.includes('[') ||
    value.includes(']') ||
    value.includes('{') ||
    value.includes('}') ||
    value.includes(',') ||
    value.includes('\n') ||
    value.includes('\r') ||
    /^\d/.test(value) ||
    value.trim() !== value ||
    value === 'true' ||
    value === 'false' ||
    value === 'null' ||
    value === 'yes' ||
    value === 'no' ||
    value === 'on' ||
    value === 'off';
  
  if (needsQuotes) {
    // Use single quotes and escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }
  return value;
}

/**
 * Initialize YAML output file (write header)
 */
function initializeYamlFile(outputPath: string): void {
  if (fs.existsSync(outputPath)) {
    // File already exists, don't overwrite
    return;
  }
  
  const header = `# Hebrew dictionary definitions for roots
# Generated: ${new Date().toISOString()}
# Model: ${CLAUDE_MODEL}

roots:
`;
  fs.writeFileSync(outputPath, header, 'utf8');
}

/**
 * Append a single root entry to YAML file
 */
function appendRootToYaml(outputPath: string, entry: RootDictionaryEntry): void {
  let yaml = `- id: ${entry.id}\n`;
  yaml += `  root: ${entry.root}\n`;
  yaml += `  def: ${escapeYamlString(entry.def)}\n`;
  
  if (entry.eg && entry.eg.length > 0) {
    yaml += `  eg:\n`;
    entry.eg.forEach(word => {
      yaml += `  - h: ${escapeYamlString(word.h)}\n`;
      yaml += `    e: ${escapeYamlString(word.e)}\n`;
      if (word.t) {
        yaml += `    t: ${escapeYamlString(word.t)}\n`;
      }
    });
  } else {
    yaml += `  eg: []\n`;
  }
  
  // Append to file
  fs.appendFileSync(outputPath, yaml, 'utf8');
}

/**
 * Regenerate complete YAML file from all entries (for final output or resume)
 */
function regenerateYamlFile(
  outputPath: string,
  entries: RootDictionaryEntry[]
): void {
  // Sort by root ID
  const sorted = entries.sort((a, b) => a.id - b.id);

  // Build YAML content
  let yaml = `# Hebrew dictionary definitions for roots
# Generated: ${new Date().toISOString()}
# Total roots: ${sorted.length}
# Model: ${CLAUDE_MODEL}

roots:
`;

  // Write each root entry in compact format
  sorted.forEach((entry) => {
    yaml += `- id: ${entry.id}\n`;
    yaml += `  root: ${entry.root}\n`;
    yaml += `  def: ${escapeYamlString(entry.def)}\n`;
    
    if (entry.eg && entry.eg.length > 0) {
      yaml += `  eg:\n`;
      entry.eg.forEach(word => {
        yaml += `  - h: ${escapeYamlString(word.h)}\n`;
        yaml += `    e: ${escapeYamlString(word.e)}\n`;
        if (word.t) {
          yaml += `    t: ${escapeYamlString(word.t)}\n`;
        }
      });
    } else {
      yaml += `  eg: []\n`;
    }
  });

  fs.writeFileSync(outputPath, yaml, 'utf8');
  console.log(`\n✅ Output written to: ${outputPath}`);
  console.log(`   Total roots: ${sorted.length}`);
  console.log(`   Total words: ${sorted.reduce((sum, e) => sum + (e.eg?.length || 0), 0)}`);
}

/**
 * Main execution
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const skipConfirm = args.includes('--yes');

  const maxCostIndex = args.indexOf('--max-cost');
  const maxCost = maxCostIndex >= 0 && args[maxCostIndex + 1] ? parseFloat(args[maxCostIndex + 1]) : undefined;

  const checkpointDirIndex = args.indexOf('--checkpoint-dir');
  const checkpointDir =
    checkpointDirIndex >= 0 && args[checkpointDirIndex + 1]
      ? args[checkpointDirIndex + 1]
      : './checkpoints';

  const outputIndex = args.indexOf('--output');
  const outputPath =
    outputIndex >= 0 && args[outputIndex + 1]
      ? args[outputIndex + 1]
      : path.join(__dirname, 'root-dictionary-definitions.yaml');

  const apiKeyIndex = args.indexOf('--api-key');
  const apiKey =
    apiKeyIndex >= 0 && args[apiKeyIndex + 1]
      ? args[apiKeyIndex + 1]
      : process.env.ANTHROPIC_API_KEY;

  const startFromIndex = args.indexOf('--start-from');
  const startFromId = startFromIndex >= 0 && args[startFromIndex + 1] ? parseInt(args[startFromIndex + 1], 10) : undefined;

  const modelIndex = args.indexOf('--model');
  const modelName = modelIndex >= 0 && args[modelIndex + 1] ? args[modelIndex + 1] : CLAUDE_MODEL;

  // Validate API key (unless dry-run)
  if (!dryRun && !apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set, or --api-key not provided');
    console.error('   Set it with: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('Hebrew Dictionary Definition Fetcher');
  console.log('='.repeat(80));
  console.log();

  // Prepare roots list
  let rootsToProcess = roots.map(r => ({
    id: r.id,
    root: `${r.P}${r.E}${r.L}`,
    definition: r.d || '',
  }));

  // Filter by start-from if specified
  if (startFromId !== undefined) {
    rootsToProcess = rootsToProcess.filter(r => r.id >= startFromId);
    console.log(`Starting from root ID: ${startFromId}`);
    console.log(`Remaining roots: ${rootsToProcess.length}\n`);
  }

  // Load checkpoint if resuming
  let checkpoint: Checkpoint | null = null;
  let completed: RootDictionaryEntry[] = [];
  let remaining = rootsToProcess;
  let totalCost = 0;
  let totalTokens = { input: 0, output: 0 };
  let startTime = new Date().toISOString();

  if (resume) {
    checkpoint = loadCheckpoint(checkpointDir);
    if (checkpoint) {
      console.log('📂 Resuming from checkpoint...');
      completed = checkpoint.completed;
      remaining = checkpoint.remaining;
      totalCost = checkpoint.totalCost;
      totalTokens = checkpoint.totalTokens;
      startTime = checkpoint.startTime;
      console.log(`   Already completed: ${completed.length.toLocaleString()}`);
      console.log(`   Remaining: ${remaining.length.toLocaleString()}`);
      console.log(`   Current cost: $${totalCost.toFixed(2)}\n`);
    } else {
      console.log('⚠️  No checkpoint found, starting fresh\n');
    }
  }

  // Estimate costs
  const estimate = estimateCost(remaining.length);
  console.log('Cost Estimate:');
  console.log(`  Roots to process: ${estimate.totalRoots.toLocaleString()}`);
  console.log(`  Estimated input tokens: ${estimate.estimatedInputTokens.toLocaleString()}`);
  console.log(`  Estimated output tokens: ${estimate.estimatedOutputTokens.toLocaleString()}`);
  console.log(`  Estimated cost: $${estimate.estimatedCost.toFixed(2)}`);
  if (maxCost !== undefined) {
    console.log(`  Budget limit: $${maxCost.toFixed(2)}`);
    if (estimate.estimatedCost > maxCost) {
      console.log(`  ⚠️  Warning: Estimated cost exceeds budget limit!`);
    }
  }
  console.log();

  // Dry-run mode
  if (dryRun) {
    console.log('🔍 DRY-RUN MODE: No API calls will be made\n');
    console.log('To run for real, remove --dry-run flag');
    process.exit(0);
  }

  // Confirmation
  if (!skipConfirm && !resume) {
    console.log('⚠️  About to start API calls. Press Ctrl+C to cancel.');
    console.log('   (Use --yes flag to skip this prompt)');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('Starting...\n');
  }

  // Initialize Claude client
  // The SDK automatically sets anthropic-version header, but we can specify it explicitly if needed
  const client = new Anthropic({ 
    apiKey,
    // DefaultVersion is set automatically by the SDK, but you can override if needed
  });

  // Initialize output file (write header if new, or regenerate from checkpoint if resuming)
  if (resume && checkpoint && completed.length > 0) {
    // When resuming, regenerate file from checkpoint to ensure it's up-to-date
    // This includes all previously completed entries
    console.log('📝 Regenerating output file from checkpoint...');
    regenerateYamlFile(outputPath, completed);
    console.log(`   Restored ${completed.length.toLocaleString()} completed entries to output file\n`);
  } else if (!fs.existsSync(outputPath)) {
    // Starting fresh, initialize new file
    initializeYamlFile(outputPath);
    console.log(`📝 Initialized output file: ${outputPath}\n`);
  } else {
    console.log(`📝 Output file exists: ${outputPath}`);
    console.log(`   Will append new entries as they're processed\n`);
  }

  console.log('🚀 Starting dictionary lookup...');
  console.log(`   Using model: ${modelName}`);
  console.log(`   Output file: ${outputPath}\n`);

  // Process roots
  let processed = 0;
  const batchSize = 5; // Save checkpoint every N roots

  for (const root of remaining) {
    // Check budget limit
    if (maxCost !== undefined && totalCost >= maxCost) {
      console.log(`\n💰 Budget limit reached ($${maxCost.toFixed(2)})`);
      console.log(`   Stopping lookup. Progress saved to checkpoint.`);
      break;
    }

    try {
      const result = await fetchRootDefinitions(
        client,
        root.id,
        root.root,
        root.definition,
        modelName
      );

      completed.push(result.entry);
      
      // Append to YAML file immediately (incremental writing)
      appendRootToYaml(outputPath, result.entry);

      // Update cost tracking
      const rootCost =
        result.inputTokens * CLAUDE_PRICING.input + result.outputTokens * CLAUDE_PRICING.output;
      totalCost += rootCost;
      totalTokens.input += result.inputTokens;
      totalTokens.output += result.outputTokens;

      processed++;

      // Progress update
      if (processed % batchSize === 0 || processed === remaining.length) {
        const progress = ((completed.length) / roots.length) * 100;
        const wordsCount = completed.reduce((sum, e) => sum + (e.eg?.length || 0), 0);
        console.log(
          `Progress: ${progress.toFixed(1)}% | Completed: ${completed.length.toLocaleString()}/${roots.length.toLocaleString()} | Words: ${wordsCount.toLocaleString()} | Cost: $${totalCost.toFixed(2)} | Remaining: ${remaining.length - processed}`
        );

        // Save checkpoint
        const newRemaining = remaining.slice(processed);
        saveCheckpoint(checkpointDir, completed, newRemaining, totalCost, totalTokens, startTime);
      }

      // Rate limiting: small delay to avoid hitting limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`\n❌ Error fetching root ${root.id} (${root.root}):`, errorMsg);
      
      // Check if it's a model not found error
      if (errorMsg.includes('not_found_error') || errorMsg.includes('model:')) {
        console.error(`   ⚠️  Model "${modelName}" not found. Try: --model claude-3-5-sonnet-20240620`);
        console.error(`   Or check available models at: https://docs.anthropic.com/en/docs/models-overview`);
      }
      
      console.error('   Continuing with next root...\n');
      // Continue with next root
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Dictionary Lookup Complete!');
  console.log('='.repeat(80));
  console.log(`Total roots processed: ${processed.toLocaleString()}`);
  console.log(`Total words retrieved: ${completed.reduce((sum, e) => sum + (e.eg?.length || 0), 0).toLocaleString()}`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log(`Total tokens: ${(totalTokens.input + totalTokens.output).toLocaleString()}`);
  console.log(`  Input: ${totalTokens.input.toLocaleString()}`);
  console.log(`  Output: ${totalTokens.output.toLocaleString()}`);
  console.log();

  // Final summary (file is already written incrementally)
  if (completed.length > 0) {
    // Regenerate complete file to ensure it's sorted and complete
    regenerateYamlFile(outputPath, completed);
    console.log('\n📦 Output file ready!');
    console.log(`   Copy to roots app: cp ${outputPath} ../roots/src/roots/root-dictionary-definitions.yaml`);
    console.log(`   Or run: ./copy-dictionary.sh`);
  } else {
    console.log('⚠️  No entries generated');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { fetchRootDefinitions, estimateCost, appendRootToYaml, regenerateYamlFile };

