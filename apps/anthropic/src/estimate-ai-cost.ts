/**
 * Cost Estimation Tool for AI-Based Definition Similarity Grading
 * 
 * This script analyzes the current grade distribution and estimates costs
 * for different hybrid approaches using AI APIs.
 * 
 * Run with: npx tsx estimate-ai-cost.ts
 */

import { roots } from './roots.js';

interface CostEstimate {
  scenario: string;
  pairsToAnalyze: number;
  estimatedTokensPerPair: number;
  totalTokens: number;
  costOpenAI: number;      // GPT-4o pricing
  costAnthropic: number;    // Claude 3.5 Sonnet pricing
  costOpenAICheaper: number; // GPT-4o-mini pricing
  notes: string;
}

/**
 * Estimate tokens for a single pair analysis
 * Format: "Definition 1: [def]\nDefinition 2: [def]\nGrade: [0-5]"
 */
function estimateTokensPerPair(): number {
  // Average definition length (from sample)
  const avgDefLength = roots.reduce((sum, r) => sum + (r.d?.length || 0), 0) / roots.length;
  
  // Prompt template overhead
  const promptOverhead = 150; // "Compare these definitions and assign a grade..."
  
  // Response overhead (just the grade number)
  const responseOverhead = 10;
  
  // Total: 2 definitions + prompt + response
  return Math.ceil((avgDefLength * 2) + promptOverhead + responseOverhead);
}

/**
 * Get definition by ID
 */
function getDefinition(id: number): string {
  const root = roots.find(r => r.id === id);
  return root?.d || '';
}

/**
 * Analyze current grade distribution
 * Note: This is a standalone app, so we estimate based on letter-based connections only
 */
function analyzeCurrentGrades() {
  const totalRoots = roots.length;
  const totalPossiblePairs = (totalRoots * (totalRoots - 1)) / 2;
  
  // For this app, we only analyze letter-based connections (~2,972 pairs)
  // We don't have access to existing grades file
  const letterBasedPairs = 2972; // Approximate from previous analysis
  
  const distribution: Record<number, number> = { 
    0: totalPossiblePairs - letterBasedPairs, 
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0 
  };
  
  return { distribution, totalPossiblePairs, totalRoots, letterBasedPairs };
}

/**
 * Generate cost estimates for different scenarios
 */
function generateCostEstimates(): CostEstimate[] {
  const { distribution, totalPossiblePairs, totalRoots } = analyzeCurrentGrades();
  const tokensPerPair = estimateTokensPerPair();
  
  // API Pricing (as of 2024, approximate)
  // OpenAI GPT-4o: $2.50/$10 per 1M tokens (input/output)
  // OpenAI GPT-4o-mini: $0.15/$0.60 per 1M tokens
  // Anthropic Claude 3.5 Sonnet: $3/$15 per 1M tokens
  
  const pricing = {
    openai: { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    openaiMini: { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    anthropic: { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  };
  
  const estimates: CostEstimate[] = [];
  
  // Scenario 1: Analyze all letter-based connections (this app's purpose)
  const letterBasedPairs = 2972; // From previous analysis
  const totalTokens1 = letterBasedPairs * tokensPerPair;
  estimates.push({
    scenario: 'Analyze all letter-based connections',
    pairsToAnalyze: letterBasedPairs,
    estimatedTokensPerPair: tokensPerPair,
    totalTokens: totalTokens1,
    costOpenAI: (totalTokens1 * pricing.openai.input) + (letterBasedPairs * 10 * pricing.openai.output),
    costAnthropic: (totalTokens1 * pricing.anthropic.input) + (letterBasedPairs * 10 * pricing.anthropic.output),
    costOpenAICheaper: (totalTokens1 * pricing.openaiMini.input) + (letterBasedPairs * 10 * pricing.openaiMini.output),
    notes: 'This app analyzes all pairs connected by letter-based rules (mischalfim, etc.)'
  });
  
  // Scenario 2: Sample validation
  const sampleSize = Math.ceil(letterBasedPairs * 0.1);
  const totalTokens2 = sampleSize * tokensPerPair;
  estimates.push({
    scenario: 'Sample validation (10% of letter-based connections)',
    pairsToAnalyze: sampleSize,
    estimatedTokensPerPair: tokensPerPair,
    totalTokens: totalTokens2,
    costOpenAI: (totalTokens2 * pricing.openai.input) + (sampleSize * 10 * pricing.openai.output),
    costAnthropic: (totalTokens2 * pricing.anthropic.input) + (sampleSize * 10 * pricing.anthropic.output),
    costOpenAICheaper: (totalTokens2 * pricing.openaiMini.input) + (sampleSize * 10 * pricing.openaiMini.output),
    notes: 'Validate accuracy by sampling, then decide on full run'
  });
  
  return estimates;
}

/**
 * Main function
 */
function main() {
  console.log('='.repeat(80));
  console.log('AI Cost Estimation for Definition Similarity Grading');
  console.log('='.repeat(80));
  console.log();
  
  const { distribution, totalPossiblePairs, totalRoots, letterBasedPairs } = analyzeCurrentGrades();
  const tokensPerPair = estimateTokensPerPair();
  
  console.log('Data Overview:');
  console.log(`  Total roots: ${totalRoots}`);
  console.log(`  Total possible pairs: ${totalPossiblePairs.toLocaleString()}`);
  console.log(`  Letter-based connections to analyze: ~${letterBasedPairs.toLocaleString()}`);
  console.log(`  Estimated tokens per pair: ${tokensPerPair}`);
  console.log();
  
  console.log('Note: This app analyzes only letter-based connections.');
  console.log('      For full analysis of all pairs, use the roots app.\n');
  
  console.log('Cost Estimates by Scenario:');
  console.log('='.repeat(80));
  
  const estimates = generateCostEstimates();
  
  estimates.forEach((est, idx) => {
    console.log();
    console.log(`${idx + 1}. ${est.scenario}`);
    console.log(`   Pairs to analyze: ${est.pairsToAnalyze.toLocaleString()}`);
    console.log(`   Total tokens: ${est.totalTokens.toLocaleString()}`);
    console.log(`   Cost (GPT-4o): $${est.costOpenAI.toFixed(2)}`);
    console.log(`   Cost (GPT-4o-mini): $${est.costOpenAICheaper.toFixed(2)}`);
    console.log(`   Cost (Claude 3.5 Sonnet): $${est.costAnthropic.toFixed(2)}`);
    console.log(`   Note: ${est.notes}`);
  });
  
  console.log();
  console.log('='.repeat(80));
  console.log('Recommendations:');
  console.log('='.repeat(80));
  console.log('1. Start with "Sample validation" to verify AI quality');
  console.log('2. If satisfied, run full "Analyze all letter-based connections"');
  console.log('3. Use Claude Sonnet (this app) or GPT-4o-mini for cost savings');
  console.log('4. The script includes rate limiting and checkpoint/resume');
  console.log('5. Output file can replace grades in roots app');
  console.log();
  console.log('Note: Actual costs may vary based on:');
  console.log('  - Actual token counts (these are estimates)');
  console.log('  - API pricing changes');
  console.log('  - Rate limiting and retry costs');
  console.log('  - Whether you use streaming (may reduce costs)');
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { estimateTokensPerPair, analyzeCurrentGrades, generateCostEstimates };

