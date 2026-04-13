import React, {useCallback, useRef} from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'react-contexify/ReactContexify.css';

export const CheckboxRenderer = ({node, column, value}) => {
  const click = useCallback(e => node.setDataValue(column.colId, e?.target?.checked), []);
  return <input type="checkbox" onChange={click} checked={value ?? false}/>;
};

export const MyGrid = ({children=null, style, contextM=undefined, onRowClicked=undefined, rowData, columnDefs, getRowNodeId=undefined, dark=true}) => {
  const gridRef = useRef(null);
  const onReady = useCallback(e => { console.log('grid ready', e); }, []);

  // Keep a ref to the latest callbacks so gridOptions (created once) never goes stale
  const cbRef = useRef({ onRowClicked, contextM });
  cbRef.current = { onRowClicked, contextM };

  // gridOptions is created once — event handlers delegate to the ref so ag-grid
  // always calls the latest function without recreating the options object
  const gridOptions = useRef({
    suppressPropertyNamesCheck: true,
    onRowClicked:       (e) => { console.log('row clicked', e.data); cbRef.current.onRowClicked?.(e); },
    onCellContextMenu:  (e) => cbRef.current.contextM?.(e),
  }).current;

  const cls = `ag-theme-balham${dark ? '-dark' : ''}`;

  return (
    <div className={cls} style={style}>
      {children}
      <AgGridReact
        ref={gridRef}
        gridOptions={gridOptions}
        components={{ checkboxRenderer: CheckboxRenderer }}
        columnDefs={columnDefs}
        rowData={rowData}
        getRowNodeId={getRowNodeId}
        onGridReady={onReady}
      />
    </div>
  );
};
