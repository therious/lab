import React, {useCallback, useRef} from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
// import 'ag-grid-community/styles/ag-theme-balham-dark.css';
import 'react-contexify/ReactContexify.css';

import {PatchNameEditor, PatchCommentEditor} from "../aggrid/PatchEditors";
import {UpdatedRenderer} from "../aggrid/UpdatedRenderer";

export const  CheckboxRenderer = ({node, column, value}) => {
  const click = useCallback(e => node.setDataValue(column.colId, e?.target?.checked),[]);
  return <input type="checkbox" onChange={click} checked={value ?? false}/>
}

export const  PatchNameRenderer = ({data, value}) => {
  if(data === undefined)
    return <></>
  if(value === '*')
    return <span style={{fontStyle: 'italic',  color:'blue'}}>saved Column A</span>
  return  <span style={{fontStyle: 'bolder',}}>{value}</span>
}



const frameworkComponents = {
  checkboxRenderer:CheckboxRenderer,
  updatedRenderer: UpdatedRenderer,
  patchNameRenderer:PatchNameRenderer,
  patchNameEditor:PatchNameEditor,
  patchCommentEditor:PatchCommentEditor,
};

export const  MyGrid = ({children, style, contextM, rowData, columnDefs,  getRowNodeId, dark=true}) => {
  const gridRef = useRef(null);
  const ready = useCallback(e=>{console.log(`ready event`, e)},[]);

  const gridOptions = {suppressPropertyNamesCheck : true};
  const className = `ag-theme-balham${dark? '-dark':''}`;
  return (
    <div  className={className} style={style}>
      {children}
      <AgGridReact
        onCellContextMenu={contextM}
        onGridReady={ready}
        ref={gridRef}
        components={frameworkComponents}
        gridOptions={gridOptions}
        toolPanel={'columns'}
        showToolPanel={true}
        reactNext={true}
        getRowNodeId={getRowNodeId}
        columnDefs={columnDefs} rowData={rowData}/>
    </div>
  );
}
