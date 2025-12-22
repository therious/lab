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

    // Sync with the actual filter model from the API
    // This ensures we're in sync when filters are restored programmatically
    useEffect(() => {
        if (!props.api || !props.column) return;
        
        const colId = props.column.getColId ? props.column.getColId() : 
                     (props.column.colId || props.column.getColDef?.().field || props.column);
        if (!colId) return;
        
        const syncWithApi = () => {
            const filterModel = props.api.getColumnFilterModel(colId);
            if (filterModel && filterModel.filter) {
                const value = filterModel.filter;
                setCurrentValue(prev => prev !== value ? value : prev);
            } else {
                setCurrentValue(prev => prev !== '' ? '' : prev);
            }
        };
        
        // Sync immediately
        syncWithApi();
        
        // Listen to filterChanged events to sync when filters change
        const filterChangedListener = () => {
            syncWithApi();
        };
        
        if (props.api.addEventListener) {
            props.api.addEventListener('filterChanged', filterChangedListener);
            return () => {
                props.api.removeEventListener('filterChanged', filterChangedListener);
            };
        }
    }, [props.api, props.column]);

    // Required by AG Grid for floating filters
    useImperativeHandle(ref, () => ({
        onParentModelChanged(parentModel) {
            const value = parentModel && parentModel.filter ? parentModel.filter : '';
            setCurrentValue(value);
        }
    }));

    const updateFilter = (value) => {
        if (!props.api || !props.column) return;
        
        const colId = props.column.getColId ? props.column.getColId() : 
                     (props.column.colId || props.column.getColDef?.().field || props.column);
        if (!colId) return;
        
        const filterModel = value ? { filter: value, type: 'contains' } : null;
        props.api.setColumnFilterModel(colId, filterModel);
        props.api.onFilterChanged();
    };

    const handleKeyDown = (e) => {
        // Handle shift-W for sin (ש with dot on left)
        if (e.key === 'W' && e.shiftKey) {
            e.preventDefault();
            const cursorPos = inputRef.current?.selectionStart || 0;
            const before = currentValue.substring(0, cursorPos);
            const after = currentValue.substring(cursorPos);
            const sin = 'ש\u05C2';
            const newValue = before + sin + after;
            setCurrentValue(newValue);
            updateFilter(newValue);
            requestAnimationFrame(() => {
                if (inputRef.current) {
                    const newPos = cursorPos + sin.length;
                    inputRef.current.setSelectionRange(newPos, newPos);
                }
            });
        }
    };

    return (
        <div className="ag-wrapper ag-input-wrapper ag-text-field-input-wrapper" style={{ display: 'flex', alignItems: 'center', padding: '0px', height: '18px' }}>
            <input
                ref={inputRef}
                type="text"
                className="ag-floating-filter-input"
                placeholder={props.placeholder || ''}
                value={currentValue}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                    const inputValue = e.target.value;
                    const converted = convertLatinToHebrew(inputValue);
                    setCurrentValue(converted);
                    
                    // Update cursor position if conversion happened
                    if (converted !== inputValue && inputRef.current) {
                        requestAnimationFrame(() => {
                            if (inputRef.current) {
                                const cursorPos = inputRef.current.selectionStart;
                                const newPos = Math.min(cursorPos, converted.length);
                                inputRef.current.setSelectionRange(newPos, newPos);
                            }
                        });
                    }
                    
                    updateFilter(converted);
                }}
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

