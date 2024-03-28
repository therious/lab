import React, { Component } from 'react';
import "ag-grid-enterprise";
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-dark.css';

const style = {height: '100%', width: '100%'};

export class MyGrid extends Component {

    constructor(props) {
        super(props);
    }
    render() {
        const {rowData, columnDefs} = this.props;
        return (
            <div className="ag-theme-dark" style={style}>
                <AgGridReact
                    defaultColDef={{enableRowGroup:true}}
                    toolPanel={'columns'}
                    showToolPanel={true}
                    reactNext={true}
                    deltaRowDataMode={true}
                    getRowNodeId={data=>data.id}
                    columnDefs={columnDefs} rowData={rowData}/>
            </div>
        );
    }
}