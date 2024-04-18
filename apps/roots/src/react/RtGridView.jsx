import React, {useCallback, useEffect, useState} from 'react';
import {MyGrid} from "./MyGrid";
import { rootsColumnDefs} from "../xform/columndefs";
import {roots} from '../roots/roots';
import {toRender} from "../roots/myvis.js";

const getRowNodeId = data=>data.id
const gridstyle = {height: '96%', width: '100%'};

const rowData= roots;

export const  RtGridView = () => {
  const [filter, setFilter]  = useState('');
  const [filteredCount, setFilteredCount] = useState(rowData.length);

  const onFilterChanged = useCallback(ev =>{
    setFilteredCount(ev.api.rowModel.rowsToDisplay.length);
    // setGraphableRows(ev.api.rowModel.rowsToDisplay);
    toRender.graphableRows = ev.api.rowModel.rowsToDisplay.map(rtd=>rtd.data);
  },[]);

  // todo this is very inefficient, but fine for now

   return  (
      <>
       Filtered/Total Roots:  {`${filteredCount}/${rowData.length}`}
        <hr/>
      <MyGrid onFilterChanged={onFilterChanged} style={gridstyle} rowData={rowData} columnDefs={rootsColumnDefs}  getRowNodeId={getRowNodeId}/>
      </>
    );
};
