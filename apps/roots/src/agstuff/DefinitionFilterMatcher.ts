// Expression parser and evaluator for definition column filter
// Supports: | (OR), & (AND), () (grouping), -/NOT (negation), "" (word boundaries)
// Keywords: AND, OR, NOT
// Example: (eat|sleep)&die means must contain "die" AND either "eat" or "sleep"
// Example: eat -sleep means contains "eat" but NOT "sleep"
// Example: "eat food" means must contain "eat food" as a phrase with word boundaries

import type { TextFilterParams } from 'ag-grid-community';

type TokenType = 'term' | 'quoted' | 'and' | 'or' | 'not' | 'lparen' | 'rparen';

type Token = 
  | { type: 'term'; value: string }
  | { type: 'quoted'; value: string }
  | { type: 'and' }
  | { type: 'or' }
  | { type: 'not' }
  | { type: 'lparen' }
  | { type: 'rparen' };

type ASTNode = 
  | { type: 'term'; value: string }
  | { type: 'quoted'; value: string }
  | { type: 'and'; left: ASTNode; right: ASTNode }
  | { type: 'or'; left: ASTNode; right: ASTNode }
  | { type: 'not'; operand: ASTNode };

type TextMatcherParams = {
  filterOption: string;
  value: unknown;
  filterText: string;
};

/**
 * Tokenizes the filter expression
 * Handles: spaces (ignored unless in quotes), double quotes (word boundaries),
 *          operators: |, &, -, AND, OR, NOT, parentheses
 */
export function tokenize(expression: string): Token[] {
    if (!expression || !expression.trim()) return [];
    
    const tokens: Token[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    function flushCurrent(): void {
        if (current.trim()) {
            const tokenValue = current.trim();
            const currentUpper = tokenValue.toUpperCase();
            if (currentUpper === 'AND') {
                tokens.push({ type: 'and' });
            } else if (currentUpper === 'OR') {
                tokens.push({ type: 'or' });
            } else if (currentUpper === 'NOT') {
                tokens.push({ type: 'not' });
            } else {
                tokens.push({ type: 'term', value: tokenValue });
            }
            current = '';
        }
    }
    
    while (i < expression.length) {
        const char = expression[i];
        
        if (char === '"') {
            // Toggle quote mode
            if (inQuotes) {
                // End of quoted string
                if (current) {
                    tokens.push({ type: 'quoted', value: current });
                    current = '';
                }
                inQuotes = false;
            } else {
                // Start of quoted string - save any current token
                flushCurrent();
                inQuotes = true;
            }
        } else if (inQuotes) {
            // Inside quotes, preserve everything including spaces
            current += char;
        } else if (char === '|' || char === '&' || char === '(' || char === ')') {
            // Save current token if any
            flushCurrent();
            // Add operator/paren
            if (char === '|') tokens.push({ type: 'or' });
            else if (char === '&') tokens.push({ type: 'and' });
            else if (char === '(') tokens.push({ type: 'lparen' });
            else if (char === ')') tokens.push({ type: 'rparen' });
        } else if (char === '-') {
            // Negation operator
            flushCurrent();
            tokens.push({ type: 'not' });
        } else if (char === ' ' || char === '\t') {
            // Space - check if current token is a complete keyword
            const currentUpper = current.trim().toUpperCase();
            if (currentUpper === 'AND') {
                tokens.push({ type: 'and' });
                current = '';
            } else if (currentUpper === 'OR') {
                tokens.push({ type: 'or' });
                current = '';
            } else if (currentUpper === 'NOT') {
                tokens.push({ type: 'not' });
                current = '';
            }
            // Otherwise ignore the space (don't add to current, but keep building current token)
        } else {
            current += char;
        }
        
        i++;
    }
    
    // Handle remaining token
    flushCurrent();
    
    // If still in quotes at the end, treat as if quote was closed
    if (inQuotes && current) {
        tokens.push({ type: 'quoted', value: current });
    }
    
    // Remove trailing operators (|, &) - they're meaningless
    while (tokens.length > 0) {
        const last = tokens[tokens.length - 1];
        if (last.type === 'or' || last.type === 'and') {
            tokens.pop();
        } else {
            break;
        }
    }
    
    return tokens;
}

/**
 * Parses tokens into an AST (Abstract Syntax Tree)
 * Uses recursive descent parsing
 * Handles: AND, OR, NOT (negation), parentheses, quoted strings
 */
export function parse(tokens: Token[]): ASTNode {
    if (tokens.length === 0) {
        throw new Error('Empty expression');
    }
    
    let index = 0;
    
    function currentToken(): Token | null {
        return index < tokens.length ? tokens[index] : null;
    }
    
    function consume(): Token | null {
        return index < tokens.length ? tokens[index++] : null;
    }
    
    // Expression: OR expression (lowest precedence)
    function parseExpression(): ASTNode {
        let left = parseAndExpression();
        
        while (currentToken()?.type === 'or') {
            consume();
            const right = parseAndExpression();
            left = { type: 'or', left, right };
        }
        
        return left;
    }
    
    // AND expression: AND has higher precedence than OR
    function parseAndExpression(): ASTNode {
        let left = parseNotExpression();
        
        while (currentToken()?.type === 'and') {
            consume();
            const right = parseNotExpression();
            left = { type: 'and', left, right };
        }
        
        return left;
    }
    
    // NOT expression: NOT has highest precedence
    function parseNotExpression(): ASTNode {
        if (currentToken()?.type === 'not') {
            consume();
            const operand = parsePrimary();
            return { type: 'not', operand };
        }
        
        return parsePrimary();
    }
    
    // Primary: term, quoted, or parenthesized expression
    function parsePrimary(): ASTNode {
        const token = consume();
        if (!token) {
            throw new Error('Unexpected end of expression');
        }
        
        if (token.type === 'term') {
            return { type: 'term', value: token.value };
        }
        
        if (token.type === 'quoted') {
            return { type: 'quoted', value: token.value };
        }
        
        if (token.type === 'lparen') {
            const expr = parseExpression();
            const next = consume();
            // If no closing paren, treat as if it was closed at the end (don't throw)
            if (next?.type !== 'rparen') {
                // Just return the expression as if paren was closed
                return expr;
            }
            return expr;
        }
        
        throw new Error(`Unexpected token: ${token.type}`);
    }
    
    return parseExpression();
}

/**
 * Checks if a word boundary exists at a position in text
 * Word boundary: start/end of string, or transition between word and non-word characters
 */
function isWordBoundary(text: string, pos: number): boolean {
    if (pos === 0 || pos === text.length) return true;
    const prev = text[pos - 1];
    const curr = text[pos];
    // Word character is alphanumeric or underscore
    const isWordChar = (c: string): boolean => /[\w]/.test(c);
    return isWordChar(prev) !== isWordChar(curr);
}

/**
 * Matches a quoted phrase with word boundaries
 */
function matchQuoted(phrase: string, text: string): boolean {
    const lowerPhrase = phrase.toLowerCase();
    const lowerText = text.toLowerCase();

    // Find all occurrences of the phrase
    let pos = 0;
    while (true) {
        const index = lowerText.indexOf(lowerPhrase, pos);
        if (index === -1) return false;

        // Check word boundaries at start and end
        if (isWordBoundary(lowerText, index) &&
            isWordBoundary(lowerText, index + lowerPhrase.length)) {
            return true;
        }

        pos = index + 1;
    }
}

/**
 * Evaluates an AST against text
 */
export function evaluate(ast: ASTNode, text: string): boolean {
    const lowerText = text.toLowerCase();
    
    switch (ast.type) {
        case 'term':
            return lowerText.includes(ast.value.toLowerCase());
        
        case 'quoted':
            return matchQuoted(ast.value, text);
        
        case 'and':
            return evaluate(ast.left, text) && evaluate(ast.right, text);
        
        case 'or':
            return evaluate(ast.left, text) || evaluate(ast.right, text);
        
        case 'not':
            return !evaluate(ast.operand, text);
        
        default:
            // Exhaustive check
            const _exhaustive: never = ast;
            return false;
    }
}

/**
 * Main function: matches a filter expression against a cell value
 * AG Grid v34 textMatcher receives: { filterOption, value, filterText }
 */
export function definitionFilterMatcher({ filterOption, value, filterText }: TextMatcherParams): boolean {
    if (!filterText || !filterText.trim()) {
        return true; // Empty filter shows all rows
    }

    if (!value) {
        return false;
    }

    const text = String(value);
    const expression = String(filterText).trim();

    try {
        const tokens = tokenize(expression);
        if (tokens.length === 0) {
            return true;
        }

        const ast = parse(tokens);
        return evaluate(ast, text);
    } catch (error) {
        // If parsing fails, fall back to simple contains match
        console.warn('Definition filter parse error:', error, 'Expression:', expression);
        return text.toLowerCase().includes(expression.toLowerCase());
    }
}

