import React from 'react';
import { useSelector } from 'react-redux';
import { MyGrid } from '../MyGrid';
import { columnDefsMap } from '../xform/columndefs';
import { aPartiesSelector } from '../connect-app';

export function PartiesView() {
  const rowData = useSelector(aPartiesSelector);
  return <MyGrid rowData={rowData} columnDefs={(columnDefsMap as any)['Parties']} />;
}
