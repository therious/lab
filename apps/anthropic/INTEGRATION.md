# Integration Guide: Using Generated Grades in Roots App

After running the analysis in the `anthropic` app, you'll have a grades file that can be integrated into the `roots` app.

## Output File

The analysis produces: `apps/anthropic/src/definition-similarity-grades-claude.ts`

This file has the **exact same format** as the existing grades file in the roots app.

## Integration Steps

### Option 1: Replace Existing File (Recommended)

```bash
# From the anthropic app directory
cp src/definition-similarity-grades-claude.ts ../roots/src/roots/definition-similarity-grades.ts
```

This replaces the existing rule-based grades with AI-generated grades.

### Option 2: Keep Both Files

If you want to keep the original grades and use Claude grades for letter-based connections:

1. Copy the file with a different name:
   ```bash
   cp src/definition-similarity-grades-claude.ts ../roots/src/roots/definition-similarity-grades-claude.ts
   ```

2. Modify the roots app code to check Claude grades first, fall back to original:
   ```typescript
   import { getDefinitionSimilarityGrade as getClaudeGrade } from './definition-similarity-grades-claude';
   import { getDefinitionSimilarityGrade as getOriginalGrade } from './definition-similarity-grades';
   
   export function getDefinitionSimilarityGrade(id1: number, id2: number): number {
     // Try Claude grades first (for letter-based connections)
     const claudeGrade = getClaudeGrade(id1, id2);
     if (claudeGrade > 0) return claudeGrade;
     
     // Fall back to original grades
     return getOriginalGrade(id1, id2);
   }
   ```

## File Format

The generated file matches the existing format exactly:

```typescript
export interface DefinitionSimilarityGrade {
  id1: number;
  id2: number;
  grade: number;
}

type DefinitionSimilarityGradeTuple = [number, number, number];

const definitionSimilarityGradesData: DefinitionSimilarityGradeTuple[] = [
  [1, 6, 2],
  [1, 7, 2],
  // ... etc
];

export const definitionSimilarityGrades: DefinitionSimilarityGrade[] = 
  definitionSimilarityGradesData.map(([id1, id2, grade]) => ({ id1, id2, grade }));

export function getDefinitionSimilarityGrade(id1: number, id2: number): number {
  // ... lookup logic
}
```

## What Gets Replaced

- **Data**: The `definitionSimilarityGradesData` array with new AI-generated grades
- **Function**: The `getDefinitionSimilarityGrade` function (same signature)
- **Types**: All types remain the same

## Verification

After copying the file:

1. Check that the roots app still compiles:
   ```bash
   cd apps/roots
   pnpm build
   ```

2. Test that grades are being used:
   - The visualization should show updated edge strengths
   - Meaning-based connections should reflect new grades

## Cleanup

After integration, you can:

- **Delete the anthropic app** - No longer needed
- **Keep it** - For future re-analysis or different tasks
- **Archive it** - Move to a separate branch or directory

The roots app has **zero dependency** on the anthropic app after integration.

