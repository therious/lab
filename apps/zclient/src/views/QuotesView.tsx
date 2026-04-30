import React from 'react';
import { useSelector } from 'react-redux';
import { MyGrid } from '../MyGrid';
import { columnDefsMap } from '../xform/columndefs';
import { aQuotesSelector } from '../connect-app';

export function QuotesView() {
  const rowData = useSelector(aQuotesSelector);
  return <MyGrid rowData={rowData} columnDefs={(columnDefsMap as any)['Quotes']} />;
}
