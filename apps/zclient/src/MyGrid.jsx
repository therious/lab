import React, { Component } from 'react';

// Suppress AG Grid Enterprise license nag messages in the console.
// This is a dev/demo app — remove if a license is ever purchased.
;(function suppressAgGridLicenseNoise() {
  const _error = console.error.bind(console);
  console.error = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // License banner lines start with '*'; the lead message matches 'AG Grid.*License'
    if (msg.startsWith('*') || /AG Grid.*License/i.test(msg)) return;
    _error(...args);
  };
})();

import "ag-grid-enterprise";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import 'react-contexify/ReactContexify.css';


const style = {height: '100%', width: '100%'};

export class MyGrid extends Component {

    constructor(props) {
        super(props);
    }
    render() {
        const {rowData, columnDefs} = this.props;
        return (
            <div className="ag-theme-balham-dark" style={style}>
                <AgGridReact
                    theme="legacy"
                    defaultColDef={{ enableRowGroup: true, sortable: true, filter: true }}
                    sideBar={{ toolPanels: ['columns', 'filters'] }}
                    getRowId={({ data }) => String(data.id)}
                    columnDefs={columnDefs}
                    rowData={rowData}
                />
            </div>
        );
    }
}
