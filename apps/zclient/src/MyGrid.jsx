import React, { Component } from 'react';
import "ag-grid-enterprise";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-balham.min.css';
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
