/**
 * AI-Powered Definition Similarity Analysis using Claude Sonnet
 * 
 * This script analyzes meaning similarity for all pairs of roots connected
 * by letter-based rules (mischalfim, gutturals, palatals, etc.) using
 * Claude Sonnet API.
 * 
 * Features:
 * - Budget limits (hard stop)
 * - Dry-run mode (no API calls)
 * - Checkpoint/resume system
 * - Real-time cost tracking
 * - Output in same format as existing grades file
 * 
 * Run with: npx tsx analyze-meanings-claude.ts [options]
 * 
 * Options:
 *   --dry-run              Show estimates without making API calls
 *   --max-cost <amount>    Maximum cost in USD (default: unlimited)
 *   --checkpoint-dir <dir> Directory for checkpoint files (default: ./checkpoints)
 *   --resume               Resume from checkpoint
 *   --api-key <key>        Claude API key (or use ANTHROPIC_API_KEY env var)
 *   --output <file>        Output file path (default: definition-similarity-grades-claude.ts)
 *   --yes                  Skip confirmation prompt
 */

import Anthropic from '@anthropic-ai/sdk';
import { roots } from './roots.js';
import { arrMischalfim, vav } from './mischalfim';
import * as fs from 'fs';
import * as path from 'path';

// Types
type DefinitionSimilarityGradeTuple = [number, number, number];

interface Checkpoint {
  completed: DefinitionSimilarityGradeTuple[];
  remaining: Array<{ id1: number; id2: number; def1: string; def2: string }>;
  totalCost: number;
  totalTokens: { input: number; output: number };
  startTime: string;
  lastUpdate: string;
}

interface AnalysisResult {
  grade: number;
  reasoning?: string;
}

// Configuration
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Correct model name for api03 keys
const CLAUDE_PRICING = {
  input: 3.00 / 1_000_000,   // $3 per 1M input tokens
  output: 15.00 / 1_000_000,  // $15 per 1M output tokens
};

// Edge-finding logic (from myvis.js)
function buildMischalfim(arr: any[]) {
  const result: Record<string, Record<string, number>> = {};
  for (let i = 0; i < arr.length; ++i) {
    const set = arr[i].data;
    for (let j = 0; j < set.length; ++j) {
      const key = set[j];
      for (let k = 0; k < set.length; ++k) {
        const m = set[k];
        if (m !== key) {
          let o = result[key];
          if (o === undefined) {
            o = result[key] = {};
          }
          o[m] = 1;
        }
      }
    }
  }
  return result;
}

function mischalef(a: string, b: string, mischalfim: Record<string, Record<string, number>>): boolean {
  const ao = mischalfim[a];
  return !!(ao && ao[b]);
}

function atLeastTwoMatch(p: string, e: string, l: string, cand: any): boolean {
  let matches = 0;
  if (p === cand.P) ++matches;
  if (e === cand.E) ++matches;
  if (l === cand.L) ++matches;
  return matches >= 2;
}

function doubledLast(p: string, e: string, l: string, root: any): boolean {
  return (e === vav && root.L === l && p === root.P && root.E === root.L);
}

function findEdge(
  p: string,
  e: string,
  l: string,
  roots: any[],
  index: number,
  mischalfim: Record<string, Record<string, number>>,
  useVavToDoubled: boolean
): number {
  const cand = roots[index];
  if (atLeastTwoMatch(p, e, l, cand)) {
    if (mischalef(p, cand.P, mischalfim) || mischalef(e, cand.E, mischalfim) || mischalef(l, cand.L, mischalfim)) {
      return index;
    } else if (useVavToDoubled && doubledLast(p, e, l, cand)) {
      return index;
    }
  }
  return -1;
}

/**
 * Find all pairs from existing grades file (all pairs with grade > 0)
 * This reads from the existing definition-similarity-grades.ts file
 */
function findAllGradedPairs(): Array<{ id1: number; id2: number; def1: string; def2: string }> {
  console.log('Loading existing grades from definition-similarity-grades.ts...');
  
  // Try to import the existing grades file
  let existingGrades: Array<{ id1: number; id2: number; grade: number }> = [];
  
  try {
    // Try to read from the roots app's grades file
    const gradesPath = path.join(__dirname, '../../roots/src/roots/definition-similarity-grades.ts');
    if (fs.existsSync(gradesPath)) {
      // Read and parse the file to extract the data array
      const fileContent = fs.readFileSync(gradesPath, 'utf8');
      
      // Extract the data array using regex
      const dataMatch = fileContent.match(/const definitionSimilarityGradesData[^=]*=\s*\[([\s\S]*?)\];/);
      if (dataMatch) {
        // Parse the tuples - this is a simplified parser
        const tuplesText = dataMatch[1];
        const tupleRegex = /\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g;
        let match;
        while ((match = tupleRegex.exec(tuplesText)) !== null) {
          existingGrades.push({
            id1: parseInt(match[1], 10),
            id2: parseInt(match[2], 10),
            grade: parseInt(match[3], 10),
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Could not load existing grades file: ${error}`);
    console.warn('Falling back to letter-based connections only...');
    return findLetterBasedConnections();
  }
  
  if (existingGrades.length === 0) {
    console.warn('No existing grades found, falling back to letter-based connections...');
    return findLetterBasedConnections();
  }
  
  console.log(`Found ${existingGrades.length.toLocaleString()} pairs with existing grades\n`);
  
  // Create a map of root IDs to definitions for quick lookup
  const rootMap = new Map<number, string>();
  roots.forEach(r => {
    rootMap.set(r.id, r.d || '');
  });
  
  // Convert to pairs with definitions
  const pairs: Array<{ id1: number; id2: number; def1: string; def2: string }> = [];
  
  for (const grade of existingGrades) {
    const def1 = rootMap.get(grade.id1) || '';
    const def2 = rootMap.get(grade.id2) || '';
    
    if (def1 && def2) {
      pairs.push({
        id1: grade.id1,
        id2: grade.id2,
        def1,
        def2,
      });
    }
  }
  
  return pairs.sort((a, b) => {
    if (a.id1 !== b.id1) return a.id1 - b.id1;
    return a.id2 - b.id2;
  });
}

/**
 * Find all pairs connected by letter-based rules (fallback option)
 */
function findLetterBasedConnections(): Array<{ id1: number; id2: number; def1: string; def2: string }> {
  const mischalfimMap = buildMischalfim(arrMischalfim);
  const useVavToDoubled = true;
  const pairs: Array<{ id1: number; id2: number; def1: string; def2: string }> = [];
  const seen = new Set<string>();

  console.log('Finding letter-based connections...');
  const totalRoots = roots.length;

  for (let i = 0; i < totalRoots; i++) {
    for (let j = i + 1; j < totalRoots; j++) {
      const root1 = roots[i];
      const root2 = roots[j];

      const matchindex = findEdge(root1.P, root1.E, root1.L, roots, j, mischalfimMap, useVavToDoubled);

      if (matchindex >= 0) {
        const key = `${Math.min(root1.id, root2.id)}_${Math.max(root1.id, root2.id)}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({
            id1: Math.min(root1.id, root2.id),
            id2: Math.max(root1.id, root2.id),
            def1: root1.d || '',
            def2: root2.d || '',
          });
        }
      }
    }
  }

  return pairs.sort((a, b) => {
    if (a.id1 !== b.id1) return a.id1 - b.id1;
    return a.id2 - b.id2;
  });
}

/**
 * Analyze a single pair using Claude
 */
async function analyzePair(
  client: Anthropic,
  def1: string,
  def2: string
): Promise<{ grade: number; inputTokens: number; outputTokens: number }> {
  const prompt = `You are analyzing semantic similarity between two Hebrew root definitions.

Definition 1: "${def1}"
Definition 2: "${def2}"

Grade the semantic similarity on a scale of 0-5:
0 - no strong relation
1 - it's plausible the meanings are connected
2 - it's very plausible the meanings are connected
3 - the meanings are clearly connected
4 - the meanings definitely overlap
5 - the two definitions are practically the same

Respond with ONLY a single number (0, 1, 2, 3, 4, or 5). No explanation, just the number.`;

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 10,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  let grade = parseInt(responseText, 10);

  // Validate grade
  if (isNaN(grade) || grade < 0 || grade > 5) {
    console.warn(`Invalid grade response: "${responseText}", defaulting to 0`);
    grade = 0;
  }

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;

  return { grade, inputTokens, outputTokens };
}

/**
 * Load checkpoint
 */
function loadCheckpoint(checkpointDir: string): Checkpoint | null {
  const checkpointPath = path.join(checkpointDir, 'checkpoint.json');
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
  completed: DefinitionSimilarityGradeTuple[],
  remaining: Array<{ id1: number; id2: number; def1: string; def2: string }>,
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

  const checkpointPath = path.join(checkpointDir, 'checkpoint.json');
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8');
}

/**
 * Estimate cost for dry-run
 */
function estimateCost(pairs: Array<{ id1: number; id2: number; def1: string; def2: string }>): {
  totalPairs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
} {
  // Estimate tokens: prompt overhead + definition lengths
  const avgDefLength = pairs.reduce((sum, p) => sum + p.def1.length + p.def2.length, 0) / pairs.length;
  const promptOverhead = 200; // Approximate prompt tokens
  const estimatedInputTokens = Math.ceil((avgDefLength + promptOverhead) * pairs.length);
  const estimatedOutputTokens = pairs.length * 5; // Just the number

  const estimatedCost =
    estimatedInputTokens * CLAUDE_PRICING.input + estimatedOutputTokens * CLAUDE_PRICING.output;

  return {
    totalPairs: pairs.length,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCost,
  };
}

/**
 * Generate output file in same format as existing grades
 */
function generateOutputFile(
  outputPath: string,
  grades: DefinitionSimilarityGradeTuple[]
): void {
  // Sort and ensure canonical ordering
  const sorted = grades.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });

  // Count distribution
  const distribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  sorted.forEach(([_, __, grade]) => {
    distribution[grade] = (distribution[grade] || 0) + 1;
  });

  const header = `/**
 * Definition Similarity Grades (Claude Sonnet Analysis)
 * 
 * This file contains grades for pairs of roots based on how related their definitions are.
 * Generated using Claude 3.5 Sonnet AI analysis for letter-based connections.
 * 
 * Grading Scale:
 * 0 - no strong relation
 * 1 - it's plausible the meanings are connected
 * 2 - it's very plausible the meanings are connected
 * 3 - the meanings are clearly connected
 * 4 - the meanings definitely overlap
 * 5 - the two definitions are practically the same
 * 
 * Format: [id1, id2, grade] where id1 < id2 (canonical ordering).
 * 
 * Grade Distribution:
${Object.entries(distribution)
  .filter(([grade]) => grade !== '0')
  .map(([grade, count]) => ` *   Grade ${grade}: ${count.toLocaleString()}`)
  .join('\n')}
 *   Total connections: ${sorted.length}
 * 
 * Generated: ${new Date().toISOString()}
 */

export interface DefinitionSimilarityGrade {
  /** First root ID (always the smaller of the two IDs) */
  id1: number;
  /** Second root ID (always the larger of the two IDs) */
  id2: number;
  /** Similarity grade from 0-5 */
  grade: number;
}

/** Tuple type for compact storage: [id1, id2, grade] */
type DefinitionSimilarityGradeTuple = [number, number, number];

/** Raw data as tuples for compact storage */
const definitionSimilarityGradesData: DefinitionSimilarityGradeTuple[] = [
${sorted.map(([id1, id2, grade]) => `  [${id1}, ${id2}, ${grade}]`).join(',\n')}
];

export const definitionSimilarityGrades: DefinitionSimilarityGrade[] = 
  definitionSimilarityGradesData.map(([id1, id2, grade]) => ({ id1, id2, grade }));

/**
 * Helper function to get the similarity grade for a pair of root IDs.
 * Returns 0 if no grade is found (implicitly no strong relation).
 */
export function getDefinitionSimilarityGrade(id1: number, id2: number): number {
  // Ensure canonical ordering
  const [minId, maxId] = id1 < id2 ? [id1, id2] : [id2, id1];
  
  const grade = definitionSimilarityGradesData.find(([gid1, gid2]) => gid1 === minId && gid2 === maxId);
  return grade ? grade[2] : 0;
}
`;

  fs.writeFileSync(outputPath, header, 'utf8');
  console.log(`\n✅ Output written to: ${outputPath}`);
  console.log(`   Total grades: ${sorted.length}`);
  console.log(`   Grade distribution:`);
  for (let grade = 1; grade <= 5; grade++) {
    const count = distribution[grade] || 0;
    if (count > 0) {
      console.log(`     Grade ${grade}: ${count.toLocaleString()}`);
    }
  }
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
      : path.join(__dirname, 'definition-similarity-grades-claude.ts');

  const apiKeyIndex = args.indexOf('--api-key');
  const apiKey =
    apiKeyIndex >= 0 && args[apiKeyIndex + 1]
      ? args[apiKeyIndex + 1]
      : process.env.ANTHROPIC_API_KEY;

  // Validate API key (unless dry-run)
  if (!dryRun && !apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set, or --api-key not provided');
    console.error('   Set it with: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('Claude Sonnet Definition Similarity Analysis');
  console.log('='.repeat(80));
  console.log();

  // Find pairs to analyze - try to load from existing grades file first
  // This will analyze all 53,743 pairs that had grade > 0 in the original algorithm
  let pairs = findAllGradedPairs();
  console.log(`Found ${pairs.length.toLocaleString()} pairs to analyze\n`);
  
  // Note: This analyzes all pairs that had grade > 0 in the original algorithm
  // This is ~53,743 pairs, not just letter-based connections (~2,972)

  // Load checkpoint if resuming
  let checkpoint: Checkpoint | null = null;
  let completed: DefinitionSimilarityGradeTuple[] = [];
  let remaining = pairs;
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
  const estimate = estimateCost(remaining);
  console.log('Cost Estimate:');
  console.log(`  Pairs to analyze: ${estimate.totalPairs.toLocaleString()}`);
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
    // Wait 3 seconds to give user time to cancel
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('Starting...\n');
  }

  // Initialize Claude client
  const client = new Anthropic({ apiKey });

  console.log('🚀 Starting analysis...\n');

  // Process pairs
  let processed = 0;
  const batchSize = 10; // Save checkpoint every N pairs

  for (const pair of remaining) {
    // Check budget limit
    if (maxCost !== undefined && totalCost >= maxCost) {
      console.log(`\n💰 Budget limit reached ($${maxCost.toFixed(2)})`);
      console.log(`   Stopping analysis. Progress saved to checkpoint.`);
      break;
    }

    try {
      const result = await analyzePair(client, pair.def1, pair.def2);

      // Only store if grade > 0 (matching existing format)
      if (result.grade > 0) {
        completed.push([pair.id1, pair.id2, result.grade]);
      }

      // Update cost tracking
      const pairCost =
        result.inputTokens * CLAUDE_PRICING.input + result.outputTokens * CLAUDE_PRICING.output;
      totalCost += pairCost;
      totalTokens.input += result.inputTokens;
      totalTokens.output += result.outputTokens;

      processed++;

      // Progress update
      if (processed % batchSize === 0 || processed === remaining.length) {
        const progress = ((completed.length + processed) / pairs.length) * 100;
        console.log(
          `Progress: ${progress.toFixed(1)}% | Completed: ${completed.length.toLocaleString()} | Cost: $${totalCost.toFixed(2)} | Remaining: ${remaining.length - processed}`
        );

        // Save checkpoint
        const newRemaining = remaining.slice(processed);
        saveCheckpoint(checkpointDir, completed, newRemaining, totalCost, totalTokens, startTime);
      }

      // Rate limiting: small delay to avoid hitting limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`\n❌ Error analyzing pair [${pair.id1}, ${pair.id2}]:`, error.message);
      console.error('   Continuing with next pair...\n');
      // Continue with next pair
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Analysis Complete!');
  console.log('='.repeat(80));
  console.log(`Total pairs analyzed: ${processed.toLocaleString()}`);
  console.log(`Pairs with grade > 0: ${completed.length.toLocaleString()}`);
  console.log(`Total cost: $${totalCost.toFixed(2)}`);
  console.log(`Total tokens: ${(totalTokens.input + totalTokens.output).toLocaleString()}`);
  console.log(`  Input: ${totalTokens.input.toLocaleString()}`);
  console.log(`  Output: ${totalTokens.output.toLocaleString()}`);
  console.log();

  // Generate output file
  if (completed.length > 0) {
    generateOutputFile(outputPath, completed);
    console.log('\n📦 Output file ready!');
    console.log(`   Copy to roots app: cp ${outputPath} ../roots/src/roots/definition-similarity-grades.ts`);
  } else {
    console.log('⚠️  No grades generated (all were grade 0)');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { findAllGradedPairs, findLetterBasedConnections, analyzePair, estimateCost };

