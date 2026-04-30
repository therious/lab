import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MyGrid } from '../MyGrid';
import { columnDefsMap } from '../xform/columndefs';
import { aQuotesSelector, omsActions } from '../connect-app';

export function QuotesView() {
  const rowData = useSelector(aQuotesSelector);

  useEffect(() => {
    omsActions.omsQuoteList();
    const id = setInterval(omsActions.omsQuoteList, 100);
    return () => clearInterval(id);
  }, []);

  return <MyGrid rowData={rowData} columnDefs={(columnDefsMap as any)['Quotes']} />;
}
