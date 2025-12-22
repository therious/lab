import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

// Hebrew-Qwerty keyboard mapping
const latinToHebrew = {
    'A': 'א',  // alef
    'B': 'ב',  // bet
    'C': 'צ',  // Tzadi
    'D': 'ד',  // daleth
    'E': 'ע',  // ayin
    'F': 'פ',  // Peh
    'G': 'ג',  // Gimmel
    'H': 'ה',  // Heh
    'I': 'י',  // Yod
    'J': 'ח',  // Chet
    'K': 'כ',  // Kaf
    'L': 'ל',  // Lamed
    'M': 'מ',  // Mem
    'N': 'נ',  // Nun
    'O': 'ו',  // vav
    'P': 'פ',  // Peh
    'Q': 'ק',  // Qof
    'R': 'ר',  // Resh
    'S': 'ס',  // Samech
    'T': 'ת',  // Tav
    'U': 'ו',  // vav
    'V': 'ו',  // vav
    'W': 'ש',  // shin
    'X': 'כ',  // kaf
    'Y': 'ט',  // Tet
    'Z': 'ז',  // zayin
};

// Convert Latin characters to Hebrew according to Hebrew-Qwerty mapping
function convertLatinToHebrew(input) {
    if (!input) return '';
    
    let result = '';
    let i = 0;
    
    while (i < input.length) {
        const char = input[i];
        const upperChar = char.toUpperCase();
        
        // Check for shift-W (sin - ש with dot on left)
        // We detect this by checking if W is uppercase and the previous context suggests shift
        // Actually, we can't detect shift directly from the string, so we'll handle W as shin
        // For sin (ש with dot), we'd need to handle it differently - but since the user types
        // the same character, we'll use shin (ש) for both W and shift-W
        // Note: ש with dot on left is U+05E9 + U+05C2, regular shin is U+05E9
        
        if (latinToHebrew[upperChar]) {
            result += latinToHebrew[upperChar];
        } else {
            // Keep non-mapped characters as-is (Hebrew characters, numbers, etc.)
            result += char;
        }
        
        i++;
    }
    
    return result;
}

// Custom floating filter that converts Latin input to Hebrew
// AG Grid React floating filters must implement onParentModelChanged via useImperativeHandle
// and call onFloatingFilterChanged to update the filter
export const HebrewFloatingFilter = forwardRef((props, ref) => {
    const inputRef = useRef(null);
    const [currentValue, setCurrentValue] = useState('');
    const propsRef = useRef(props);
    const [inputReady, setInputReady] = useState(false);
    
    // Keep props ref up to date
    useEffect(() => {
        propsRef.current = props;
    }, [props]);
    
    // Callback ref to set up event listeners when input is mounted
    const setInputRef = (node) => {
        inputRef.current = node;
        if (node) {
            setInputReady(true);
        }
    };

    // In AG Grid v34, floating filters can receive currentModel as a prop
    // We still need onParentModelChanged for backward compatibility
    useEffect(() => {
        if (props.currentModel !== undefined) {
            const value = props.currentModel && props.currentModel.filter ? props.currentModel.filter : '';
            setCurrentValue(value);
            if (inputRef.current) {
                inputRef.current.value = value;
            }
        }
    }, [props.currentModel]);

    useImperativeHandle(ref, () => {
        return {
            onParentModelChanged(parentModel) {
                // When the filter model changes, update the input
                const value = parentModel && parentModel.filter ? parentModel.filter : '';
                setCurrentValue(value);
                if (inputRef.current) {
                    inputRef.current.value = value;
                }
            }
        };
    });

    useEffect(() => {
        if (!inputReady || !inputRef.current) {
            return;
        }
        
        const input = inputRef.current;
        
        const updateFilter = (value) => {
            const currentProps = propsRef.current;
            const filterModel = value ? { filter: value, type: 'contains' } : null;
            
            // Try multiple ways to update the filter
            // Method 1: Use onModelChange callback (AG Grid v34 preferred)
            if (currentProps.onModelChange) {
                currentProps.onModelChange(filterModel);
                // Ensure filter is applied
                if (currentProps.api) {
                    currentProps.api.onFilterChanged();
                }
                return true;
            }
            
            // Method 2: Use onFloatingFilterChanged callback (AG Grid v32 style, still supported)
            if (currentProps.onFloatingFilterChanged) {
                currentProps.onFloatingFilterChanged(filterModel);
                // Ensure filter is applied
                if (currentProps.api) {
                    currentProps.api.onFilterChanged();
                }
                return true;
            }
            
            // Method 3: Use AG Grid v34 API directly (setColumnFilterModel)
            if (currentProps.api && currentProps.column) {
                // Get column ID - can be getColId() method or colId property
                const colId = currentProps.column.getColId ? currentProps.column.getColId() : 
                             (currentProps.column.colId || currentProps.column.getColDef?.().field || currentProps.column);
                if (value) {
                    currentProps.api.setColumnFilterModel(colId, filterModel);
                } else {
                    currentProps.api.setColumnFilterModel(colId, null);
                }
                // Explicitly trigger filter changed
                currentProps.api.onFilterChanged();
                return true;
            }
            
            // Method 4: Fallback to old API (deprecated in v34 but might still work)
            if (currentProps.column && currentProps.column.getFilterInstance) {
                const filterInstance = currentProps.column.getFilterInstance();
                if (filterInstance) {
                    if (value) {
                        filterInstance.setModel(filterModel);
                    } else {
                        filterInstance.setModel(null);
                    }
                    // Trigger filter changed event
                    if (currentProps.api) {
                        currentProps.api.onFilterChanged();
                    }
                    return true;
                }
            }
            
            return false;
        };
        
        const handleInput = (e) => {
            const inputValue = e.target.value;
            
            // Convert Latin to Hebrew
            const converted = convertLatinToHebrew(inputValue);
            
            // Update the input with Hebrew characters
            if (converted !== inputValue) {
                const cursorPos = input.selectionStart;
                input.value = converted;
                // Try to maintain cursor position (approximate)
                const newPos = Math.min(cursorPos, converted.length);
                input.setSelectionRange(newPos, newPos);
            }
            
            setCurrentValue(converted);
            updateFilter(converted);
        };
        
        const handleKeyDown = (e) => {
            // Handle shift-W for sin (ש with dot on left)
            if (e.key === 'W' && e.shiftKey) {
                e.preventDefault();
                const cursorPos = input.selectionStart;
                const before = input.value.substring(0, cursorPos);
                const after = input.value.substring(cursorPos);
                // ש with dot on left: U+05E9 + U+05C2
                const sin = 'ש\u05C2';
                input.value = before + sin + after;
                setCurrentValue(input.value);
                const newPos = cursorPos + sin.length;
                input.setSelectionRange(newPos, newPos);
                updateFilter(input.value);
            }
        };
        
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeyDown);
        
        return () => {
            input.removeEventListener('input', handleInput);
            input.removeEventListener('keydown', handleKeyDown);
        };
    }, [inputReady]); // Re-run when input is ready

    return (
        <div className="ag-wrapper ag-input-wrapper ag-text-field-input-wrapper" style={{ display: 'flex', alignItems: 'center', padding: '0px', height: '18px' }}>
            <input
                ref={setInputRef}
                type="text"
                className="ag-floating-filter-input"
                placeholder={props.placeholder || ''}
                defaultValue={currentValue}
                style={{ 
                    width: '100%',
                    height: '18px',
                    padding: '1px 4px 1px 2px',
                    margin: '0px',
                    lineHeight: 'normal',
                    verticalAlign: 'baseline'
                }}
            />
        </div>
    );
});

