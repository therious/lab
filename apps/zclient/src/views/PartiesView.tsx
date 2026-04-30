import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { MyGrid } from '../MyGrid';
import { columnDefsMap } from '../xform/columndefs';
import { aPartiesSelector, omsActions } from '../connect-app';

export function PartiesView() {
  const rowData = useSelector(aPartiesSelector);

  useEffect(() => {
    omsActions.omsPartyList();
  }, []);

  return <MyGrid rowData={rowData} columnDefs={(columnDefsMap as any)['Parties']} />;
}
