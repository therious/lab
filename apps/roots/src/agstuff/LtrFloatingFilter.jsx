import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

// LTR floating filter for non-Hebrew columns (ID and definition)
// Ensures proper left-to-right text direction and cursor positioning
export const LtrFloatingFilter = forwardRef((props, ref) => {
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
            
            // Try multiple ways to update the filter (AG Grid v34 compatible)
            // Method 1: Use onModelChange callback (AG Grid v34 preferred)
            if (currentProps.onModelChange) {
                currentProps.onModelChange(filterModel);
                if (currentProps.api) {
                    currentProps.api.onFilterChanged();
                }
                return true;
            }
            
            // Method 2: Use onFloatingFilterChanged callback (AG Grid v32 style, still supported)
            if (currentProps.onFloatingFilterChanged) {
                currentProps.onFloatingFilterChanged(filterModel);
                if (currentProps.api) {
                    currentProps.api.onFilterChanged();
                }
                return true;
            }
            
            // Method 3: Use AG Grid v34 API directly (setColumnFilterModel)
            if (currentProps.api && currentProps.column) {
                const colId = currentProps.column.getColId ? currentProps.column.getColId() : 
                             (currentProps.column.colId || currentProps.column.getColDef?.().field || currentProps.column);
                if (value) {
                    currentProps.api.setColumnFilterModel(colId, filterModel);
                } else {
                    currentProps.api.setColumnFilterModel(colId, null);
                }
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
            setCurrentValue(inputValue);
            updateFilter(inputValue);
        };
        
        input.addEventListener('input', handleInput);
        
        return () => {
            input.removeEventListener('input', handleInput);
        };
    }, [inputReady]);

    return (
        <div className="ag-wrapper ag-input-wrapper ag-text-field-input-wrapper" style={{ display: 'flex', alignItems: 'center', padding: '0px', height: '18px', direction: 'ltr' }}>
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
                    verticalAlign: 'baseline',
                    direction: 'ltr',
                    textAlign: 'left'
                }}
            />
        </div>
    );
});

