import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

const style = {height: '100%', width: '100%'};

export class MyGrid extends Component {

    constructor(props) {
        super(props);
    }
    render() {
        const {rowData, columnDefs} = this.props;
        return (
            <div className="ag-theme-balham" style={style}>
                <AgGridReact columnDefs={columnDefs} rowData={rowData}/>
            </div>
        );
    }
}