/**
 * Cost Estimation for Analyzing Meaning of All Letter-Based Connections
 * 
 * This script counts how many pairs of roots are connected by letter-based rules
 * (mischalfim, gutturals, palatals, etc.) and estimates the cost to analyze
 * meaning similarity for ALL of them, even if current grade is 0.
 * 
 * Run with: npx tsx estimate-letter-connections-cost.ts
 */

import { roots } from './roots.js';
import { arrMischalfim, vav } from './mischalfim';

// Copy the edge-finding logic from myvis.js
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
 * Count all pairs connected by letter-based rules
 */
function countLetterBasedConnections(): {
  totalConnectedPairs: number;
  pairsWithGradeZero: number;
  pairsWithGradeNonZero: number;
  gradeDistribution: Record<number, number>;
} {
  const mischalfimMap = buildMischalfim(arrMischalfim);
  const useVavToDoubled = true;
  
  const connectedPairs = new Set<string>();
  const gradeDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  console.log('Scanning all root pairs for letter-based connections...');
  const totalRoots = roots.length;
  const totalPairs = (totalRoots * (totalRoots - 1)) / 2;
  let processed = 0;
  const reportInterval = Math.floor(totalPairs / 100);
  
  for (let i = 0; i < totalRoots; i++) {
    for (let j = i + 1; j < totalRoots; j++) {
      const root1 = roots[i];
      const root2 = roots[j];
      
      // Check if they're connected by letter-based rules
      const matchindex = findEdge(root1.P, root1.E, root1.L, roots, j, mischalfimMap, useVavToDoubled);
      
      if (matchindex >= 0) {
        // They are connected! Create canonical key
        const key = `${Math.min(root1.id, root2.id)}_${Math.max(root1.id, root2.id)}`;
        connectedPairs.add(key);
        
        // Note: We don't check existing grades here since this is a standalone app
        // All pairs will be analyzed regardless of existing grade
        gradeDistribution[0] = (gradeDistribution[0] || 0) + 1;
      }
      
      processed++;
      if (processed % reportInterval === 0) {
        const percentage = (processed / totalPairs) * 100;
        console.log(`Progress: ${percentage.toFixed(1)}% (${processed.toLocaleString()}/${totalPairs.toLocaleString()} pairs, ${connectedPairs.size} connections found)`);
      }
    }
  }
  
  const pairsWithGradeZero = gradeDistribution[0] || 0;
  const pairsWithGradeNonZero = connectedPairs.size - pairsWithGradeZero;
  
  return {
    totalConnectedPairs: connectedPairs.size,
    pairsWithGradeZero,
    pairsWithGradeNonZero,
    gradeDistribution
  };
}

/**
 * Estimate cost for analyzing all letter-based connections
 */
function estimateCosts(connectedPairs: number, tokensPerPair: number) {
  // API Pricing (as of 2024)
  const pricing = {
    openai: { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    openaiMini: { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    anthropic: { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  };
  
  const totalTokens = connectedPairs * tokensPerPair;
  const avgResponseTokens = 10; // Just the grade number
  
  return {
    totalTokens,
    costOpenAI: (totalTokens * pricing.openai.input) + (connectedPairs * avgResponseTokens * pricing.openai.output),
    costAnthropic: (totalTokens * pricing.anthropic.input) + (connectedPairs * avgResponseTokens * pricing.anthropic.output),
    costOpenAICheaper: (totalTokens * pricing.openaiMini.input) + (connectedPairs * avgResponseTokens * pricing.openaiMini.output),
  };
}

function main() {
  console.log('='.repeat(80));
  console.log('Cost Estimation: Analyzing Meaning for ALL Letter-Based Connections');
  console.log('='.repeat(80));
  console.log();
  
  const tokensPerPair = 194; // From previous estimate
  
  const result = countLetterBasedConnections();
  const costs = estimateCosts(result.totalConnectedPairs, tokensPerPair);
  
  console.log();
  console.log('Results:');
  console.log('='.repeat(80));
  console.log(`Total pairs connected by letter-based rules: ${result.totalConnectedPairs.toLocaleString()}`);
  console.log(`  (All pairs will be analyzed, regardless of existing grades)`);
  console.log();
  
  console.log('Cost Estimates (analyzing ALL letter-based connections):');
  console.log('='.repeat(80));
  console.log(`Total tokens: ${costs.totalTokens.toLocaleString()}`);
  console.log(`Cost (GPT-4o): $${costs.costOpenAI.toFixed(2)}`);
  console.log(`Cost (GPT-4o-mini): $${costs.costOpenAICheaper.toFixed(2)}`);
  console.log(`Cost (Claude 3.5 Sonnet): $${costs.costAnthropic.toFixed(2)}`);
  console.log();
  
  console.log('Note: This analyzes meaning for ALL pairs connected by letter rules,');
  console.log('      even if the current meaning grade is 0. This ensures no');
  console.log('      semantic relationships are missed for letter-connected roots.');
}

if (require.main === module) {
  main();
}

export { countLetterBasedConnections, estimateCosts };

