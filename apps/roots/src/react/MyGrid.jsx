import React, {useCallback, useRef} from 'react';
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

export const  MyGrid = ({children, style, contextM, rowData, columnDefs,  onFilterChanged, getRowNodeId, dark=true}) => {
    const gridRef = useRef(null);
    const ready = useCallback(e=>{console.log(`ready event`, e)},[]);

    const gridOptions = {suppressPropertyNamesCheck : true};
    const className = `ag-theme-balham${dark? '-dark':''}`;
    return (
        <div  className={className} style={style}>
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
