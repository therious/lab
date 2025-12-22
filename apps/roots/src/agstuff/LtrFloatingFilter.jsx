import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

// LTR floating filter for non-Hebrew columns (ID and definition)
// Ensures proper left-to-right text direction and cursor positioning
export const LtrFloatingFilter = forwardRef((props, ref) => {
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

    return (
        <div className="ag-wrapper ag-input-wrapper ag-text-field-input-wrapper" style={{ display: 'flex', alignItems: 'center', padding: '0px', height: '18px', direction: 'ltr' }}>
            <input
                ref={inputRef}
                type="text"
                className="ag-floating-filter-input"
                placeholder={props.placeholder || ''}
                value={currentValue}
                onChange={(e) => {
                    const inputValue = e.target.value;
                    setCurrentValue(inputValue);
                    updateFilter(inputValue);
                }}
                style={{ 
                    width: '100%',
                    height: '18px',
                    padding: '1px 4px 1px 2px',
                    margin: '0px',
                    lineHeight: 'normal',
                    verticalAlign: 'baseline',
                    direction: 'ltr',
                    textAlign: 'right'
                }}
            />
        </div>
    );
});

