import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MyGrid } from '../MyGrid';
import { columnDefsMap } from '../xform/columndefs';
import { aTradesSelector, omsActions } from '../connect-app';

export function TradesView() {
  const rowData = useSelector(aTradesSelector);

  useEffect(() => {
    omsActions.omsTradeList();
    const id = setInterval(omsActions.omsTradeList, 100);
    return () => clearInterval(id);
  }, []);

  return <MyGrid rowData={rowData} columnDefs={(columnDefsMap as any)['Trades']} />;
}
