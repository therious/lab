import React, {useCallback, useState, useRef, useMemo} from 'react';
import {MyGrid} from "./MyGrid";
import { createRootsColumnDefs} from "../xform/columndefs";
import {roots} from '../roots/roots';
import {toRender, expandFilteredWithLinkedRoots, expandFilteredWithIndirectlyLinkedRoots} from "../roots/myvis.js";
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';
import {actions, useSelector} from '../actions-integration';

const getRowNodeId = params => {
  // AG Grid v34 getRowId callback receives { data } object, not data directly
  // Extract data from params object
  const data = params && typeof params === 'object' && 'data' in params ? params.data : params;
  
  // Use the 'id' property from the row data
  // AG Grid v34 requires getRowId to return a string
  if (!data) {
    throw new Error(`getRowId: row data is required`);
  }
  if (data.id === undefined || data.id === null) {
    throw new Error(`getRowId: row data must have an 'id' property. Received: ${JSON.stringify(data)}`);
  }
  return String(data.id);
}
const gridstyle = {height: '96%', width: '100%'};

const rowData= roots;
const kHeaderContextMenu = 'headerContextMenu';

export const  RtGridView = () => {
  const [filter, setFilter]  = useState('');
  const [filteredCount, setFilteredCount] = useState(rowData.length);
  const [menuState, setMenuState] = useState({ hasColumnFilter: false, hasAnyFilter: false, hasAnySort: false });
  const [multiLineExamples, setMultiLineExamples] = useState(false);
  const gridApiRef = useRef(null);
  const currentColumnRef = useRef(null);
  const {show: showContextMenu} = useContextMenu({});
  
  // Get grid state from Redux
  const gridState = useSelector(s => s.grid);
  const { options: { mischalfim, otherChoices } } = useSelector(s => s);

  const onFilterChanged = useCallback(ev =>{
    const api = ev.api;
    if (!api) return;
    
    // Get all rows that pass the current filters
    const filteredRoots = [];
    api.forEachNodeAfterFilter((node) => {
      if (node.data) {
        filteredRoots.push(node.data);
      }
    });
    
    setFilteredCount(filteredRoots.length);
    toRender.graphableRows = filteredRoots;
    
    // Create expanded linked list (directly linked) and store it for the visualization
    const expandedLinkedRoots = expandFilteredWithLinkedRoots(filteredRoots, roots, mischalfim, otherChoices);
    toRender.expandedLinkedRows = expandedLinkedRoots;
    
    // Create indirectly linked list (transitive closure) and store it for the visualization
    const indirectlyLinkedRoots = expandFilteredWithIndirectlyLinkedRoots(filteredRoots, roots, mischalfim, otherChoices);
    toRender.indirectlyLinkedRows = indirectlyLinkedRoots;
    
    // Log which roots are in the expanded linked lists
    console.log('=== Expanded Linked Roots ===');
    console.log(`Filtered roots: ${filteredRoots.length}`);
    console.log(`Directly linked roots: ${expandedLinkedRoots.length}`);
    console.log(`Indirectly linked roots: ${indirectlyLinkedRoots.length}`);
    console.log(`Newly directly linked: ${expandedLinkedRoots.length - filteredRoots.length}`);
    console.log(`Newly indirectly linked: ${indirectlyLinkedRoots.length - filteredRoots.length}`);
    console.log('\nFiltered root IDs:', filteredRoots.map(r => r.id).sort((a, b) => a - b));
    console.log('\nDirectly linked root IDs:', expandedLinkedRoots.map(r => r.id).sort((a, b) => a - b));
    console.log('\nIndirectly linked root IDs:', indirectlyLinkedRoots.map(r => r.id).sort((a, b) => a - b));
    
    // Save filter state to Redux
    if (gridApiRef.current) {
      const filterModel = gridApiRef.current.getFilterModel();
      const columnState = gridApiRef.current.getColumnState();
      actions.grid.setGridState(filterModel || null, columnState || null);
    }
  },[mischalfim, otherChoices]);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
    
    // Restore filter state from Redux
    if (gridState.filterModel || gridState.columnState) {
      // Restore column state first (sorting, etc.)
      if (gridState.columnState && gridState.columnState.length > 0) {
        params.api.applyColumnState({ state: gridState.columnState });
      }
      
      // Restore filter model
      if (gridState.filterModel && Object.keys(gridState.filterModel).length > 0) {
        // Restore filters using v34 API
        // Floating filter components will sync automatically via filterChanged events
        Object.keys(gridState.filterModel).forEach(colId => {
          const filterModel = gridState.filterModel[colId];
          if (filterModel) {
            params.api.setColumnFilterModel(colId, filterModel);
          }
        });
        params.api.onFilterChanged();
      }
    }
  }, [gridState]);

  const updateMenuState = useCallback(() => {
    if (!gridApiRef.current) return;
    const api = gridApiRef.current;
    const colId = currentColumnRef.current?.getColId();
    
    const hasColumnFilter = colId ? api.isColumnFilterPresent(colId) : false;
    const filterModel = api.getFilterModel();
    const hasAnyFilter = filterModel && Object.keys(filterModel).length > 0;
    
    // Use getColumnState() instead of deprecated getSortModel()
    const columnStates = api.getColumnState();
    const hasAnySort = columnStates && columnStates.some(col => col.sort != null);
    
    setMenuState({ hasColumnFilter, hasAnyFilter, hasAnySort });
  }, []);

  const onHeaderContextMenu = useCallback((params) => {
    const {event, column} = params;
    if (!column || !event) return;
    
    currentColumnRef.current = column;
    updateMenuState();
    
    if (event) {
      showContextMenu({
        id: kHeaderContextMenu,
        event,
        props: {
          column: column,
          api: params.api
        }
      });
    }
  }, [showContextMenu, updateMenuState]);

  const clearThisFilter = useCallback(() => {
    if (!gridApiRef.current || !currentColumnRef.current) return;
    const api = gridApiRef.current;
    const column = currentColumnRef.current;
    const colId = column.getColId();
    
    // Clear the filter model
    api.setColumnFilterModel(colId, null);
    api.onFilterChanged();
    
    // Directly clear the floating filter input by finding it in the DOM
    // Find the header cell for this column and clear its floating filter input
    setTimeout(() => {
      const gridElement = document.querySelector('.ag-theme-balham, .ag-theme-balham-dark');
      if (gridElement) {
        const headerCell = gridElement.querySelector(`[col-id="${colId}"]`);
        if (headerCell) {
          const floatingFilterInput = headerCell.querySelector('.ag-floating-filter-input');
          if (floatingFilterInput) {
            floatingFilterInput.value = '';
            // Trigger input event to ensure any listeners are notified
            floatingFilterInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }, 0);
  }, []);

  const clearAllFilters = useCallback(() => {
    if (!gridApiRef.current) return;
    const api = gridApiRef.current;
    
    // Clear all filter models using v34 API (setColumnFilterModel for each column)
    const allColumns = api.getColumns();
    if (allColumns) {
      allColumns.forEach(column => {
        const colId = column.getColId();
        api.setColumnFilterModel(colId, null);
      });
    }
    api.onFilterChanged();
    
    // Clear Redux state
    actions.grid.clearGridState();
    
    // Directly clear all floating filter inputs
    setTimeout(() => {
      const gridElement = document.querySelector('.ag-theme-balham, .ag-theme-balham-dark');
      if (gridElement) {
        const floatingFilterInputs = gridElement.querySelectorAll('.ag-floating-filter-input');
        floatingFilterInputs.forEach(input => {
          input.value = '';
          // Trigger input event to ensure any listeners are notified
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }
    }, 0);
  }, []);

  const clearAllSorting = useCallback(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.applyColumnState({
      defaultState: { sort: null }
    });
  }, []);

  // Create column defs with dynamic cell renderer based on multiLineExamples
  const columnDefs = useMemo(() => {
    return createRootsColumnDefs(multiLineExamples);
  }, [multiLineExamples]);

  // Update column defs when multiLineExamples changes
  React.useEffect(() => {
    if (gridApiRef.current) {
      gridApiRef.current.setGridOption('columnDefs', columnDefs);
      // Enable auto-height for multi-line mode
      // When autoHeight is set on a column, AG Grid automatically calculates row height
      // We need to reset row heights to trigger recalculation
      if (multiLineExamples) {
        // Enable auto-height by setting getRowHeight to undefined (default behavior)
        gridApiRef.current.setGridOption('getRowHeight', undefined);
        // Reset row heights to recalculate with new column defs
        setTimeout(() => {
          gridApiRef.current?.resetRowHeights();
        }, 0);
      } else {
        // Disable auto-height by setting a fixed height
        gridApiRef.current.setGridOption('getRowHeight', null);
        gridApiRef.current.resetRowHeights();
      }
    }
  }, [columnDefs, multiLineExamples]);

  // todo this is very inefficient, but fine for now

   return  (
      <>
       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
         <span>Filtered/Total Roots: {`${filteredCount}/${rowData.length}`}</span>
         <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'normal' }}>
           <input 
             type="checkbox" 
             checked={multiLineExamples}
             onChange={(e) => setMultiLineExamples(e.target.checked)}
           />
           <span>Multi-line</span>
         </label>
       </div>
        <hr/>
      <MyGrid 
        onFilterChanged={onFilterChanged} 
        onGridReady={onGridReady}
        onHeaderContextMenu={onHeaderContextMenu}
        style={gridstyle} 
        rowData={rowData} 
        columnDefs={columnDefs}  
        getRowId={getRowNodeId}
      >
        <Menu id={kHeaderContextMenu}>
          <Item 
            id="clearThisFilter" 
            onClick={clearThisFilter}
            disabled={!menuState.hasColumnFilter}
          >
            Clear This Filter
          </Item>
          <Separator/>
          <Item 
            id="clearAllFilters" 
            onClick={clearAllFilters}
            disabled={!menuState.hasAnyFilter}
          >
            Clear All Filters
          </Item>
          <Separator/>
          <Item 
            id="clearAllSorting" 
            onClick={clearAllSorting}
            disabled={!menuState.hasAnySort}
          >
            Clear All Sorting
          </Item>
        </Menu>
      </MyGrid>
      </>
    );
};
