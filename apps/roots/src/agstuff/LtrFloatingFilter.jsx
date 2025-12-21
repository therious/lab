import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

// Simple LTR floating filter for non-Hebrew columns
export const LtrFloatingFilter = forwardRef((props, ref) => {
    const inputRef = useRef(null);
    const [currentValue, setCurrentValue] = useState('');
    
    // Debug: log props to see what AG Grid passes
    useEffect(() => {
        console.log('LtrFloatingFilter props:', Object.keys(props));
    }, []);

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
        if (!inputRef.current) return;
        
        const input = inputRef.current;
        
        const handleInput = (e) => {
            const inputValue = e.target.value;
            setCurrentValue(inputValue);
            
            // Try multiple ways to update the filter
            // Method 1: Use onFloatingFilterChanged callback
            if (props.onFloatingFilterChanged) {
                props.onFloatingFilterChanged(inputValue ? { filter: inputValue } : null);
                return;
            }
            
            // Method 2: Use onModelChange callback
            if (props.onModelChange) {
                props.onModelChange(inputValue ? { filter: inputValue } : null);
                return;
            }
            
            // Method 3: Use column API directly
            if (props.column && props.column.getFilterInstance) {
                const filterInstance = props.column.getFilterInstance();
                if (filterInstance) {
                    if (inputValue) {
                        filterInstance.setModel({ filter: inputValue, type: 'contains' });
                    } else {
                        filterInstance.setModel(null);
                    }
                    // Trigger filter changed event
                    if (props.api) {
                        props.api.onFilterChanged();
                    }
                    return;
                }
            }
            
            console.warn('LtrFloatingFilter: No way to update filter found', {
                hasOnFloatingFilterChanged: !!props.onFloatingFilterChanged,
                hasOnModelChange: !!props.onModelChange,
                hasColumn: !!props.column,
                hasApi: !!props.api,
                allProps: Object.keys(props)
            });
        };
        
        input.addEventListener('input', handleInput);
        
        return () => {
            input.removeEventListener('input', handleInput);
        };
    }, [props]);

    return (
        <input
            ref={inputRef}
            type="text"
            className="ag-floating-filter-input"
            placeholder={props.placeholder || ''}
            defaultValue={currentValue}
            style={{ width: '100%', direction: 'ltr', textAlign: 'left' }}
        />
    );
});

