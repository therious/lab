import React, {useCallback, useRef} from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'react-contexify/ReactContexify.css';

export const CheckboxRenderer = ({node, column, value}) => {
  const click = useCallback(e => node.setDataValue(column.colId, e?.target?.checked), []);
  return <input type="checkbox" onChange={click} checked={value ?? false}/>;
};

export const MyGrid = ({children=null, style, contextM=undefined, onRowClicked=undefined, rowData, columnDefs, getRowNodeId=undefined, dark=true, rowSelection=undefined, isRowSelectable=undefined, rowClassRules=undefined}) => {
  const gridRef = useRef(null);
  const onReady = useCallback(e => { console.log('grid ready', e); }, []);

  const cbRef = useRef({ onRowClicked, contextM, isRowSelectable });
  cbRef.current = { onRowClicked, contextM, isRowSelectable };

  const gridOptions = useRef({
    suppressPropertyNamesCheck: true,
    onRowClicked:      (e) => { console.log('row clicked', e.data); cbRef.current.onRowClicked?.(e); },
    onCellContextMenu: (e) => cbRef.current.contextM?.(e),
    isRowSelectable:   (node) => cbRef.current.isRowSelectable ? cbRef.current.isRowSelectable(node) : true,
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
        rowSelection={rowSelection}
        rowClassRules={rowClassRules}
      />
    </div>
  );
};
