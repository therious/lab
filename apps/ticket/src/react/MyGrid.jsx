import React, {useCallback, useRef} from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'react-contexify/ReactContexify.css';

export const CheckboxRenderer = ({node, column, value}) => {
  const click = useCallback(e => node.setDataValue(column.colId, e?.target?.checked), []);
  return <input type="checkbox" onChange={click} checked={value ?? false}/>;
};

const components = { checkboxRenderer: CheckboxRenderer };

export const MyGrid = ({children=null, style, contextM=undefined, rowData, columnDefs, getRowNodeId=undefined, dark=true}) => {
  const gridRef  = useRef(null);
  const onReady  = useCallback(e => { console.log('grid ready', e); }, []);
  const gridOpts = { suppressPropertyNamesCheck: true };
  const cls      = `ag-theme-balham${dark ? '-dark' : ''}`;

  return (
    <div className={cls} style={style}>
      {children}
      <AgGridReact
        ref={gridRef}
        components={components}
        gridOptions={gridOpts}
        columnDefs={columnDefs}
        rowData={rowData}
        getRowNodeId={getRowNodeId}
        onCellContextMenu={contextM}
        onGridReady={onReady}
      />
    </div>
  );
};
