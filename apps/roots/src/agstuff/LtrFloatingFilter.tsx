import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import type { Column, GridApi, IFloatingFilterParams } from 'ag-grid-community';

// Using interface here because AG Grid's IFloatingFilterParams is an interface
// and we need to extend/compose with it for proper type compatibility
type LtrFloatingFilterProps = IFloatingFilterParams & {
  placeholder?: string;
};

type LtrFloatingFilterRef = {
  onParentModelChanged: (parentModel: { filter?: string } | null) => void;
};

// LTR floating filter for non-Hebrew columns (ID and definition)
// Ensures proper left-to-right text direction and cursor positioning
export const LtrFloatingFilter = forwardRef<LtrFloatingFilterRef, LtrFloatingFilterProps>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentValue, setCurrentValue] = useState<string>('');

  // Sync with the actual filter model from the API
  // This ensures we're in sync when filters are restored programmatically
  useEffect(() => {
    if (!props.api || !props.column) return;
    
    const colId = props.column.getColId ? props.column.getColId() : 
                 (props.column.getColDef?.().field || String(props.column));
    if (!colId) return;
    
    const syncWithApi = (): void => {
      const filterModel = props.api?.getColumnFilterModel(colId);
      if (filterModel && typeof filterModel === 'object' && 'filter' in filterModel) {
        const value = String(filterModel.filter || '');
        setCurrentValue(prev => prev !== value ? value : prev);
      } else {
        setCurrentValue(prev => prev !== '' ? '' : prev);
      }
    };
    
    // Sync immediately
    syncWithApi(); 
    
    // Listen to filterChanged events to sync when filters change
    const filterChangedListener = (): void => {
      syncWithApi();
    };
    
    if (props.api.addEventListener) {
      props.api.addEventListener('filterChanged', filterChangedListener);
      return () => {
        props.api?.removeEventListener('filterChanged', filterChangedListener);
      };
    }
  }, [props.api, props.column]);

  // Required by AG Grid for floating filters
  useImperativeHandle(ref, () => ({
    onParentModelChanged(parentModel: { filter?: string } | null): void {
      const value = parentModel && parentModel.filter ? String(parentModel.filter) : '';
      setCurrentValue(value);
    }
  }));

  const updateFilter = (value: string): void => {
    if (!props.api || !props.column) return;
    
    const colId = props.column.getColId ? props.column.getColId() : 
                 (props.column.getColDef?.().field || String(props.column));
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

LtrFloatingFilter.displayName = 'LtrFloatingFilter';

