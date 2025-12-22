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
    const updateFilterRef = useRef(null);
    
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
    // This is a fallback - the API sync below is the primary mechanism
    useEffect(() => {
        if (props.currentModel !== undefined) {
            const value = props.currentModel && props.currentModel.filter ? props.currentModel.filter : '';
            setCurrentValue(prev => prev !== value ? value : prev);
        }
    }, [props.currentModel]);
    
    // Also sync with the actual filter model from the API periodically
    // This ensures we're in sync even if AG Grid doesn't call onParentModelChanged
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
        
        // Also listen to filterChanged events to sync when filters change
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

    useImperativeHandle(ref, () => {
        return {
            onParentModelChanged(parentModel) {
                // When the filter model changes, update the state
                // React will update the controlled input automatically
                const value = parentModel && parentModel.filter ? parentModel.filter : '';
                setCurrentValue(value);
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
        
        // Store updateFilter in a ref so onChange can access it
        updateFilterRef.current = updateFilter;
        
        const handleKeyDown = (e) => {
            // Handle shift-W for sin (ש with dot on left)
            if (e.key === 'W' && e.shiftKey) {
                e.preventDefault();
                const cursorPos = input.selectionStart;
                const before = currentValue.substring(0, cursorPos);
                const after = currentValue.substring(cursorPos);
                // ש with dot on left: U+05E9 + U+05C2
                const sin = 'ש\u05C2';
                const newValue = before + sin + after;
                setCurrentValue(newValue);
                updateFilterRef.current(newValue);
                requestAnimationFrame(() => {
                    if (input) {
                        const newPos = cursorPos + sin.length;
                        input.setSelectionRange(newPos, newPos);
                    }
                });
            }
        };
        
        input.addEventListener('keydown', handleKeyDown);
        
        return () => {
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
                value={currentValue}
                onChange={(e) => {
                    const inputValue = e.target.value;
                    
                    // Convert Latin to Hebrew
                    const converted = convertLatinToHebrew(inputValue);
                    
                    // Update state (React will update the controlled input)
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
                    
                    // Update filter - use the updateFilter from the effect closure
                    const currentProps = propsRef.current;
                    const filterModel = converted ? { filter: converted, type: 'contains' } : null;
                    
                    if (currentProps.onModelChange) {
                        currentProps.onModelChange(filterModel);
                        if (currentProps.api) {
                            currentProps.api.onFilterChanged();
                        }
                    } else if (currentProps.onFloatingFilterChanged) {
                        currentProps.onFloatingFilterChanged(filterModel);
                        if (currentProps.api) {
                            currentProps.api.onFilterChanged();
                        }
                    } else if (currentProps.api && currentProps.column) {
                        const colId = currentProps.column.getColId ? currentProps.column.getColId() : 
                                     (currentProps.column.colId || currentProps.column.getColDef?.().field || currentProps.column);
                        if (converted) {
                            currentProps.api.setColumnFilterModel(colId, filterModel);
                        } else {
                            currentProps.api.setColumnFilterModel(colId, null);
                        }
                        currentProps.api.onFilterChanged();
                    }
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

