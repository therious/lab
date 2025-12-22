import React, {useCallback, useRef, useEffect} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'ag-grid-community/styles/agGridBalhamFont.css';
import 'react-contexify/ReactContexify.css';

// Register AG Grid modules (required in v34+)
ModuleRegistry.registerModules([AllCommunityModule]);

import {CheckboxRenderer} from '../agstuff/CheckboxRenderer';
import {DiffRenderer} from "../agstuff/DiffRenderer";
import {HebrewFloatingFilter} from '../agstuff/HebrewFloatingFilter';
import {LtrFloatingFilter} from '../agstuff/LtrFloatingFilter';



const frameworkComponents = {
    checkboxRenderer:CheckboxRenderer,
    diffRenderer:DiffRenderer,
    hebrewFloatingFilter: HebrewFloatingFilter,
    ltrFloatingFilter: LtrFloatingFilter,
};

export const  MyGrid = ({children, style, contextM, rowData, columnDefs,  onFilterChanged, onGridReady, onHeaderContextMenu, getRowNodeId, dark=true}) => {
    const gridRef = useRef(null);
    const gridContainerRef = useRef(null);
    const gridApiRef = useRef(null);
    
    const ready = useCallback(e=>{
        console.log(`ready event`, e);
        gridApiRef.current = e.api;
        if (onGridReady) {
            onGridReady(e);
        }
    },[onGridReady]);

    // Attach context menu handler to header elements
    useEffect(() => {
        if (!onHeaderContextMenu || !gridContainerRef.current) return;
        
        const container = gridContainerRef.current;
        
        const handleContextMenu = (event) => {
            // Check if the target is a header cell
            const headerCell = event.target.closest('.ag-header-cell');
            if (headerCell && gridApiRef.current) {
                event.preventDefault();
                event.stopPropagation();
                
                const api = gridApiRef.current;
                
                // Try to get column ID from various attributes
                let colId = headerCell.getAttribute('col-id') || 
                           headerCell.getAttribute('colid');
                
                // If not found, try to find by column index
                if (!colId) {
                    const allHeaders = Array.from(container.querySelectorAll('.ag-header-cell'));
                    const index = allHeaders.indexOf(headerCell);
                    if (index >= 0) {
                        const columns = api.getColumns();
                        if (columns && columns[index]) {
                            colId = columns[index].getColId();
                        }
                    }
                }
                
                if (colId) {
                    const column = api.getColumn(colId);
                    if (column) {
                        onHeaderContextMenu({
                            event: event,
                            column: column,
                            api: api
                        });
                    }
                }
            }
        };
        
        container.addEventListener('contextmenu', handleContextMenu, true);
        
        return () => {
            container.removeEventListener('contextmenu', handleContextMenu, true);
        };
    }, [onHeaderContextMenu]);

    const gridOptions = {
        suppressPropertyNamesCheck : true,
        popupParent: document.body
    };
    const className = `ag-theme-balham${dark? '-dark':''}`;
    return (
        <div ref={gridContainerRef} className={className} style={style}>
            {children}
            <AgGridReact
                onFilterChanged={onFilterChanged}
                enableRtl={true}
                onCellContextMenu={contextM}
                onGridReady={ready}
                ref={gridRef}
                components={frameworkComponents}
                gridOptions={gridOptions}
                sideBar={{ toolPanels: ['columns'], defaultToolPanel: 'columns' }}
                theme={dark ? 'balham-dark' : 'balham'}
                getRowNodeId={getRowNodeId}
                columnDefs={columnDefs} rowData={rowData}/>
        </div>
    );
}
