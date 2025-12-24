/**
 * Definition filter utility - extracted from AG Grid specific code
 * Supports: | (OR), & (AND), () (grouping), -/NOT (negation), "" (word boundaries)
 */

// Import the tokenizer, parser, and evaluator from DefinitionFilterMatcher
import { tokenize, parse, evaluate } from '../agstuff/DefinitionFilterMatcher';

/**
 * Check if a text value matches the filter expression
 * Uses the same logic as the definition column filter in AG Grid
 */
export function matchesDefinitionFilter(text: string, filterExpression: string): boolean {
  if (!filterExpression || !filterExpression.trim()) {
    return true; // Empty filter matches everything
  }
  
  if (!text) {
    return false; // No text to match
  }
  
  try {
    const tokens = tokenize(filterExpression);
    if (tokens.length === 0) {
      return true; // No tokens means match all
    }
    
    const ast = parse(tokens);
    return evaluate(ast, text);
  } catch (error) {
    // If parsing fails, fall back to simple contains match
    console.warn('Definition filter parse error:', error, 'Expression:', filterExpression);
    return text.toLowerCase().includes(filterExpression.toLowerCase());
  }
}

