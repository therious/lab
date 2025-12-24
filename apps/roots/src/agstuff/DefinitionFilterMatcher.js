// Expression parser and evaluator for definition column filter
// Supports: | (OR), & (AND), () (grouping), -/NOT (negation), "" (word boundaries)
// Keywords: AND, OR, NOT
// Example: (eat|sleep)&die means must contain "die" AND either "eat" or "sleep"
// Example: eat -sleep means contains "eat" but NOT "sleep"
// Example: "eat food" means must contain "eat food" as a phrase with word boundaries

/**
 * Tokenizes the filter expression
 * Handles: spaces (ignored unless in quotes), double quotes (word boundaries),
 *          operators: |, &, -, AND, OR, NOT, parentheses
 */
export function tokenize(expression) {
    if (!expression || !expression.trim()) return [];
    
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    function flushCurrent() {
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
    
    return tokens;
}

/**
 * Parses tokens into an AST (Abstract Syntax Tree)
 * Uses recursive descent parsing
 * Handles: AND, OR, NOT (negation), parentheses, quoted strings
 */
export function parse(tokens) {
    let index = 0;
    
    function parseExpression() {
        return parseAnd();
    }
    
    function parseAnd() {
        let left = parseOr();
        
        while (index < tokens.length && tokens[index].type === 'and') {
            index++; // consume '&' or 'AND'
            const right = parseOr();
            left = { type: 'and', left, right };
        }
        
        return left;
    }
    
    function parseOr() {
        let left = parseNot();
        
        while (index < tokens.length && tokens[index].type === 'or') {
            index++; // consume '|' or 'OR'
            const right = parseNot();
            left = { type: 'or', left, right };
        }
        
        return left;
    }
    
    function parseNot() {
        if (index < tokens.length && (tokens[index].type === 'not' || tokens[index].type === '-')) {
            index++; // consume 'NOT' or '-'
            const expr = parsePrimary();
            return { type: 'not', expr };
        }
        return parsePrimary();
    }
    
    function parsePrimary() {
        if (index >= tokens.length) {
            throw new Error('Unexpected end of expression');
        }
        
        const token = tokens[index];
        
        if (token.type === 'term') {
            index++;
            return { type: 'term', value: token.value };
        } else if (token.type === 'quoted') {
            index++;
            return { type: 'quoted', value: token.value };
        } else if (token.type === 'lparen') {
            index++; // consume '('
            const expr = parseExpression();
            if (index >= tokens.length || tokens[index].type !== 'rparen') {
                throw new Error('Expected closing parenthesis');
            }
            index++; // consume ')'
            return expr;
        } else {
            throw new Error(`Unexpected token: ${token.type}`);
        }
    }
    
    try {
        const ast = parseExpression();
        if (index < tokens.length) {
            throw new Error('Unexpected tokens after expression');
        }
        return ast;
    } catch (error) {
        // If parsing fails, treat the entire expression as a simple term
        const fallbackValue = tokens.map(t => {
            if (t.value) return t.value;
            if (t.type === 'and') return '&';
            if (t.type === 'or') return '|';
            if (t.type === 'not') return '-';
            if (t.type === 'lparen') return '(';
            if (t.type === 'rparen') return ')';
            return '';
        }).join('');
        return { type: 'term', value: fallbackValue };
    }
}

/**
 * Checks if a word boundary exists at a position in text
 * Word boundary: start/end of string, or transition between word and non-word characters
 */
function isWordBoundary(text, pos) {
    if (pos === 0 || pos === text.length) return true;
    const prev = text[pos - 1];
    const curr = text[pos];
    // Word character is alphanumeric or underscore
    const isWordChar = (c) => /[\w]/.test(c);
    return isWordChar(prev) !== isWordChar(curr);
}

/**
 * Matches a quoted phrase with word boundaries
 */
function matchQuoted(phrase, text) {
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
 * Evaluates the AST against a text value
 */
export function evaluate(ast, text) {
    if (!text) text = '';
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
            return !evaluate(ast.expr, text);
        
        default:
            return false;
    }
}

/**
 * Main function: matches a filter expression against a cell value
 * AG Grid v34 textMatcher receives: { filterOption, value, filterText }
 * @param {Object} params - AG Grid filter params
 * @param {string} params.filterText - The filter expression
 * @param {any} params.value - The cell value to match against
 * @param {string} params.filterOption - The filter option (contains, equals, etc.)
 * @returns {boolean} - True if the value matches the expression
 */
export function definitionFilterMatcher({ filterOption, value, filterText }) {
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

