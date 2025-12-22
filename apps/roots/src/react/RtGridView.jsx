import React, {useCallback, useState, useRef} from 'react';
import {MyGrid} from "./MyGrid";
import { rootsColumnDefs} from "../xform/columndefs";
import {roots} from '../roots/roots';
import {toRender} from "../roots/myvis.js";
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';

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
  const gridApiRef = useRef(null);
  const currentColumnRef = useRef(null);
  const {show: showContextMenu} = useContextMenu({});

  const onFilterChanged = useCallback(ev =>{
    const rowsToDisplay = ev.api?.rowModel?.rowsToDisplay || [];
    setFilteredCount(rowsToDisplay.length);
    // setGraphableRows(rowsToDisplay);
    toRender.graphableRows = rowsToDisplay.map(rtd=>rtd.data);
  },[]);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
  }, []);

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
    
    // Clear all filter models
    api.setFilterModel(null);
    api.onFilterChanged();
    
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

  // todo this is very inefficient, but fine for now

   return  (
      <>
       Filtered/Total Roots:  {`${filteredCount}/${rowData.length}`}
        <hr/>
      <MyGrid 
        onFilterChanged={onFilterChanged} 
        onGridReady={onGridReady}
        onHeaderContextMenu={onHeaderContextMenu}
        style={gridstyle} 
        rowData={rowData} 
        columnDefs={rootsColumnDefs}  
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
