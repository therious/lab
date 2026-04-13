import React from 'react';

export const CheckboxRenderer: React.FC<any>;

export const MyGrid: React.FC<{
  children?:         React.ReactNode;
  style?:            React.CSSProperties;
  contextM?:         (event: any) => void;
  onRowClicked?:     (event: any) => void;
  rowData:           any[];
  columnDefs:        any[];
  getRowNodeId?:     (data: any) => any;
  dark?:             boolean;
  rowSelection?:     'single' | 'multiple';
  isRowSelectable?:  (node: any) => boolean;
  rowClassRules?:    Record<string, (params: any) => boolean>;
  apiRef?:           React.MutableRefObject<any>;
}>;
