import React from 'react';
import { useSelector } from 'react-redux';
import { MyGrid } from '../MyGrid';
import { columnDefsMap } from '../xform/columndefs';
import { aTradesSelector } from '../connect-app';

export function TradesView() {
  const rowData = useSelector(aTradesSelector);
  return <MyGrid rowData={rowData} columnDefs={(columnDefsMap as any)['Trades']} />;
}
