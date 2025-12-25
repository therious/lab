/**
 * Script to generate definition similarity grades
 * 
 * This script analyzes all root definitions and generates similarity grades
 * for all pairs of roots.
 * 
 * Run with: npx tsx generate-similarity-grades.ts
 */

import { roots } from './roots.js';
import type { DefinitionSimilarityGrade } from './definition-similarity-grades';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Analyze semantic similarity between two definitions
 * Returns a grade from 0-5 based on meaning overlap
 */
function gradeDefinitions(def1: string, def2: string): number {
  if (!def1 || !def2) return 0;
  
  const d1 = def1.toLowerCase().trim();
  const d2 = def2.toLowerCase().trim();
  
  // Exact or near-exact match (5)
  if (d1 === d2) return 5;
  
  // Check for very similar phrasing
  const words1 = d1.split(/[;,\s]+/).filter(w => w.length > 2);
  const words2 = d2.split(/[;,\s]+/).filter(w => w.length > 2);
  
  // Count exact word matches
  const wordSet1 = new Set(words1);
  const wordSet2 = new Set(words2);
  const commonWords = [...wordSet1].filter(w => wordSet2.has(w));
  
  // Strong overlap - most words match (4)
  if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.7) {
    return 4;
  }
  
  // Check for semantic concepts
  const concepts1 = extractConcepts(d1);
  const concepts2 = extractConcepts(d2);
  const commonConcepts = concepts1.filter(c => concepts2.includes(c));
  
  // Definite overlap - shared core concepts (4)
  if (commonConcepts.length >= 2) {
    return 4;
  }
  
  // Clear connection - one strong shared concept (3)
  if (commonConcepts.length === 1 && commonWords.length >= 1) {
    return 3;
  }
  
  // Very plausible - related concepts (2)
  if (commonConcepts.length === 1 || areRelatedConcepts(concepts1, concepts2)) {
    return 2;
  }
  
  // Plausible - some word overlap or related meanings (1)
  if (commonWords.length >= 1 || hasSemanticOverlap(d1, d2)) {
    return 1;
  }
  
  // No strong relation (0)
  return 0;
}

/**
 * Extract key semantic concepts from a definition
 */
function extractConcepts(def: string): string[] {
  const concepts: string[] = [];
  const lower = def.toLowerCase();
  
  // Action concepts
  if (lower.includes('collect') || lower.includes('gather') || lower.includes('store')) concepts.push('collect');
  if (lower.includes('connect') || lower.includes('tie') || lower.includes('bind') || lower.includes('combine')) concepts.push('connect');
  if (lower.includes('pain') || lower.includes('distress') || lower.includes('suffer')) concepts.push('pain');
  if (lower.includes('love') || lower.includes('devote')) concepts.push('love');
  if (lower.includes('feed') || lower.includes('digest') || lower.includes('nourish') || lower.includes('absorb')) concepts.push('nourish');
  if (lower.includes('create') || lower.includes('make') || lower.includes('form')) concepts.push('create');
  if (lower.includes('remove') || lower.includes('expel') || lower.includes('disappear') || lower.includes('go away')) concepts.push('remove');
  if (lower.includes('contain') || lower.includes('hold') || lower.includes('store') || lower.includes('keep')) concepts.push('contain');
  if (lower.includes('extend') || lower.includes('stretch') || lower.includes('reach')) concepts.push('extend');
  if (lower.includes('sustain') || lower.includes('support') || lower.includes('base') || lower.includes('foundation')) concepts.push('support');
  if (lower.includes('power') || lower.includes('status') || lower.includes('control') || lower.includes('exert')) concepts.push('power');
  if (lower.includes('express') || lower.includes('communicate') || lower.includes('project')) concepts.push('express');
  if (lower.includes('radiate') || lower.includes('spread') || lower.includes('emit')) concepts.push('radiate');
  if (lower.includes('fill') || lower.includes('complete')) concepts.push('fill');
  if (lower.includes('effect') || lower.includes('result') || lower.includes('motion') || lower.includes('set into')) concepts.push('effect');
  if (lower.includes('crave') || lower.includes('seek') || lower.includes('desire')) concepts.push('desire');
  if (lower.includes('scurry') || lower.includes('move') || lower.includes('hurry')) concepts.push('move');
  if (lower.includes('vacillate') || lower.includes('waver') || lower.includes('lack clarity')) concepts.push('uncertainty');
  if (lower.includes('limit') || lower.includes('condition') || lower.includes('restrict')) concepts.push('limit');
  if (lower.includes('acquire') || lower.includes('get') || lower.includes('obtain')) concepts.push('acquire');
  if (lower.includes('push') || lower.includes('goal') || lower.includes('hurry')) concepts.push('push');
  if (lower.includes('light') || lower.includes('illuminate') || lower.includes('bright')) concepts.push('light');
  if (lower.includes('weaken') || lower.includes('hinder') || lower.includes('frail')) concepts.push('weaken');
  if (lower.includes('order') || lower.includes('organize') || lower.includes('arrange')) concepts.push('order');
  if (lower.includes('ponder') || lower.includes('weigh') || lower.includes('consider')) concepts.push('think');
  if (lower.includes('chain') || lower.includes('gird') || lower.includes('hold together')) concepts.push('bind');
  if (lower.includes('unity') || lower.includes('one') || lower.includes('together')) concepts.push('unity');
  if (lower.includes('grasp') || lower.includes('take hold') || lower.includes('seize')) concepts.push('grasp');
  if (lower.includes('delay') || lower.includes('lag') || lower.includes('slow')) concepts.push('delay');
  if (lower.includes('penetrate') || lower.includes('enter') || lower.includes('pierce')) concepts.push('penetrate');
  if (lower.includes('close') || lower.includes('seal') || lower.includes('shut')) concepts.push('close');
  if (lower.includes('isolate') || lower.includes('separate') || lower.includes('set apart')) concepts.push('isolate');
  if (lower.includes('strengthen') || lower.includes('secure') || lower.includes('fortify')) concepts.push('strengthen');
  if (lower.includes('fear') || lower.includes('danger') || lower.includes('threat')) concepts.push('fear');
  if (lower.includes('consume') || lower.includes('eat') || lower.includes('devour')) concepts.push('consume');
  if (lower.includes('force') || lower.includes('compel') || lower.includes('coerce')) concepts.push('force');
  if (lower.includes('master') || lower.includes('control') || lower.includes('dominate')) concepts.push('control');
  if (lower.includes('curse') || lower.includes('condemn') || lower.includes('damn')) concepts.push('curse');
  if (lower.includes('deny') || lower.includes('obstruct') || lower.includes('block')) concepts.push('obstruct');
  if (lower.includes('serve') || lower.includes('help') || lower.includes('assist')) concepts.push('serve');
  if (lower.includes('depend') || lower.includes('rely') || lower.includes('need')) concepts.push('depend');
  if (lower.includes('organize') || lower.includes('arrange') || lower.includes('structure')) concepts.push('organize');
  if (lower.includes('pass') || lower.includes('change') || lower.includes('transform')) concepts.push('change');
  if (lower.includes('spring') || lower.includes('emerge') || lower.includes('appear')) concepts.push('emerge');
  if (lower.includes('cause') || lower.includes('direct') || lower.includes('lead')) concepts.push('cause');
  if (lower.includes('sigh') || lower.includes('complain') || lower.includes('lament')) concepts.push('complain');
  if (lower.includes('central') || lower.includes('pivotal') || lower.includes('key')) concepts.push('central');
  if (lower.includes('mourn') || lower.includes('grieve') || lower.includes('lament')) concepts.push('mourn');
  if (lower.includes('enrage') || lower.includes('anger') || lower.includes('fury')) concepts.push('anger');
  if (lower.includes('choke') || lower.includes('groan') || lower.includes('struggle')) concepts.push('struggle');
  if (lower.includes('gather') || lower.includes('collect') || lower.includes('accumulate')) concepts.push('gather');
  if (lower.includes('restrain') || lower.includes('bind') || lower.includes('restrict')) concepts.push('restrain');
  if (lower.includes('cover') || lower.includes('crust') || lower.includes('surface')) concepts.push('cover');
  if (lower.includes('darken') || lower.includes('prevent light') || lower.includes('obscure')) concepts.push('darken');
  if (lower.includes('pant') || lower.includes('greedily') || lower.includes('eager')) concepts.push('eager');
  if (lower.includes('distance') || lower.includes('set aside') || lower.includes('separate')) concepts.push('distance');
  if (lower.includes('hoard') || lower.includes('accumulate') || lower.includes('save')) concepts.push('hoard');
  if (lower.includes('wild') || lower.includes('untamed') || lower.includes('savage')) concepts.push('wild');
  if (lower.includes('sew') || lower.includes('connect pieces') || lower.includes('join')) concepts.push('join');
  if (lower.includes('ready') || lower.includes('complete') || lower.includes('finished')) concepts.push('complete');
  if (lower.includes('overpower') || lower.includes('dominate') || lower.includes('conquer')) concepts.push('overpower');
  if (lower.includes('root') || lower.includes('deep') || lower.includes('foundation')) concepts.push('root');
  if (lower.includes('raise') || lower.includes('high') || lower.includes('elevate')) concepts.push('elevate');
  if (lower.includes('search') || lower.includes('seek') || lower.includes('find')) concepts.push('search');
  if (lower.includes('decrease') || lower.includes('reduce') || lower.includes('lessen')) concepts.push('decrease');
  
  return concepts;
}

/**
 * Check if two concept sets are related
 */
function areRelatedConcepts(concepts1: string[], concepts2: string[]): boolean {
  const relatedGroups = [
    ['collect', 'gather', 'hoard', 'store', 'contain'],
    ['connect', 'bind', 'tie', 'join', 'combine'],
    ['pain', 'distress', 'suffer', 'complain', 'mourn'],
    ['nourish', 'feed', 'absorb', 'consume'],
    ['create', 'make', 'form', 'build'],
    ['remove', 'expel', 'disappear', 'distance'],
    ['support', 'sustain', 'base', 'foundation', 'root'],
    ['power', 'control', 'master', 'exert', 'overpower'],
    ['express', 'communicate', 'project', 'radiate'],
    ['move', 'push', 'scurry', 'hurry'],
    ['limit', 'restrict', 'restrain', 'obstruct'],
    ['acquire', 'get', 'obtain', 'receive'],
    ['weaken', 'hinder', 'frail', 'struggle'],
    ['order', 'organize', 'arrange', 'structure'],
    ['think', 'ponder', 'weigh', 'consider'],
    ['unity', 'one', 'together', 'combine'],
    ['grasp', 'take hold', 'seize', 'grasp'],
    ['close', 'seal', 'shut', 'cover'],
    ['isolate', 'separate', 'set apart', 'distance'],
    ['strengthen', 'secure', 'fortify', 'support'],
    ['fear', 'danger', 'threat', 'worry'],
    ['serve', 'help', 'assist', 'support'],
    ['depend', 'rely', 'need', 'require'],
    ['change', 'transform', 'pass', 'shift'],
    ['emerge', 'spring', 'appear', 'arise'],
    ['cause', 'direct', 'lead', 'effect'],
    ['anger', 'enrage', 'fury', 'rage'],
    ['restrain', 'bind', 'restrict', 'limit'],
    ['cover', 'crust', 'surface', 'layer'],
    ['darken', 'obscure', 'hide', 'cover'],
    ['eager', 'pant', 'greedily', 'desire'],
    ['complete', 'ready', 'finished', 'done'],
    ['elevate', 'raise', 'high', 'lift'],
    ['search', 'seek', 'find', 'look'],
  ];
  
  for (const group of relatedGroups) {
    const has1 = concepts1.some(c => group.includes(c));
    const has2 = concepts2.some(c => group.includes(c));
    if (has1 && has2) return true;
  }
  
  return false;
}

/**
 * Check for semantic overlap using word similarity
 */
function hasSemanticOverlap(def1: string, def2: string): boolean {
  const words1 = def1.toLowerCase().split(/[;,\s]+/).filter(w => w.length > 3);
  const words2 = def2.toLowerCase().split(/[;,\s]+/).filter(w => w.length > 3);
  
  // Check for similar words (stemming-like)
  const stems1 = words1.map(w => w.substring(0, Math.min(4, w.length)));
  const stems2 = words2.map(w => w.substring(0, Math.min(4, w.length)));
  
  return stems1.some(s1 => stems2.some(s2 => s1 === s2));
}

/**
 * Main function to generate all similarity grades
 */
function generateSimilarityGrades(): DefinitionSimilarityGrade[] {
  const grades: DefinitionSimilarityGrade[] = [];
  const totalRoots = roots.length;
  const totalPairs = (totalRoots * (totalRoots - 1)) / 2;
  
  console.log(`Processing ${totalRoots} roots (${totalPairs} pairs)...`);
  
  let processed = 0;
  const reportInterval = Math.floor(totalPairs / 100); // Report every 1%
  
  for (let i = 0; i < totalRoots; i++) {
    for (let j = i + 1; j < totalRoots; j++) {
      const root1 = roots[i];
      const root2 = roots[j];
      
      const grade = gradeDefinitions(root1.d, root2.d);
      
      // Only store grades > 0 (no need to store non-relations)
      if (grade > 0) {
        grades.push({
          id1: Math.min(root1.id, root2.id),
          id2: Math.max(root1.id, root2.id),
          grade,
        });
      }
      
      processed++;
      
      if (processed % reportInterval === 0) {
        const percentage = (processed / totalPairs) * 100;
        console.log(`Progress: ${percentage.toFixed(1)}% (${processed}/${totalPairs} pairs, ${grades.length} with grade > 0)`);
      }
    }
  }
  
  console.log(`\nComplete! Generated ${grades.length} similarity grades.`);
  console.log(`Grade distribution:`);
  const distribution = [0, 0, 0, 0, 0, 0];
  grades.forEach(g => distribution[g.grade]++);
  for (let i = 1; i <= 5; i++) {
    console.log(`  Grade ${i}: ${distribution[i]}`);
  }
  
  return grades.sort((a, b) => {
    if (a.id1 !== b.id1) return a.id1 - b.id1;
    return a.id2 - b.id2;
  });
}

// Run if executed directly
if (require.main === module) {
  const grades = generateSimilarityGrades();
  
  // Write to file
  const outputPath = path.join(__dirname, 'definition-similarity-grades.ts');
  const content = `/**
 * Definition Similarity Grades
 * 
 * This file contains grades for pairs of roots based on how related their definitions are.
 * 
 * Grading Scale:
 * 0 - no strong relation
 * 1 - it's plausible the meanings are connected
 * 2 - it's very plausible the meanings are connected
 * 3 - the meanings are clearly connected
 * 4 - the meanings definitely overlap
 * 5 - the two definitions are practically the same
 * 
 * Generated automatically by analyzing semantic similarity of root definitions.
 */

import type { DefinitionSimilarityGrade } from './definition-similarity-grades';

export const definitionSimilarityGrades: DefinitionSimilarityGrade[] = ${JSON.stringify(grades, null, 2)};
`;
  
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`\nWritten ${grades.length} grades to ${outputPath}`);
}

