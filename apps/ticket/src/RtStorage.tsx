import React, {useState, useEffect, useCallback} from 'react';
import styled from 'styled-components';

import {actions, useSelector} from "./actions-integration";
import {PatchEditorsInit} from "./aggrid/PatchEditors";
import {MyGrid} from './react/MyGrid';
import {Menu, Item, Separator, useContextMenu} from 'react-contexify';
import {Modalize} from '@therious/components';

const numberSort = (num1:number, num2:number):number => num1 - num2;

PatchEditorsInit(actions.patch);


const patchColumns = [
  {f:'sel', maxWidth:50, cellRenderer: 'checkboxRenderer', floatingFilter:false},
  {f: 'updated', maxWidth:140, comparator:numberSort, cellRenderer: 'updatedRenderer'},
  {f: 'name', maxWidth:140, tooltipField: 'name', editable: true, cellEditor: 'patchNameEditor', cellRenderer: 'patchNameRenderer', floatingFilter: true, floatingFilterComponentParams: { suppressFilterButton: true }},
  {f: 'keys', maxWidth: 60, comparator:numberSort,},
  {f: 'comments', editable: true, cellEditor: 'patchCommentEditor', floatingFilter: true, floatingFilterComponentParams: { suppressFilterButton: true }},
].map(o=>({...o,  suppressMenu: true, }));

// default column properties to be overridden
const defCol = { sortable:true, filter:true, enableCellChangeFlash:true};

// convert our compact column definition to ag-grid column definition
function toAgColDef(v:any):any {

  if(typeof v === 'string')
    return {...defCol, headerName: v.toUpperCase(), field: v};

  const o = {...v};

  o.headerName = (o.h||o.f).toUpperCase();
  o.field = o.f;
  delete o.f;  // todo this is non-functional, this delete stuff
  delete o.h;

  return {...defCol, ...o};

}


export const patchColumnDefs = patchColumns.map(o=>toAgColDef(o)); // xform abbrievated column definitions to AgGrid spec columnDefinitions

const kPatchContextMenu = 'patchMenu';

export const ContextMenuHeader = styled.div`
  color: blue;
  min-height: 100%;
  min-width: 100%;
  font-weight: bold;
  font-size: larger;
  display: inline-block;
  cursor: default;
  padding:5px;
  &:hover {}
`;
const gridstyle = {height: '400px', width: '100%'};

const getPatchRowNodeId = (data:any)=>data.updated;

// describePatch for now just counts the top level keys
// it also believes the definition of the patch is a Record<number,number> which needs to change
function describePatch(patch:Record<number,number>):string
{
  const keyCount = Object.keys(patch).reduce((accum,_)=>accum+1, 0);
  return `(${keyCount})`;
}

export const RtStorage = () => {
  const [currentPatchName, setCurrentPatchName] = useState('');
  const [currentPatchData, setCurrentPatchData] = useState(undefined);
  const {
    patch: {patches, filter: patchFilter},
  } = useSelector(s => s);
  const {show: showContextMenu} = useContextMenu({});

  const openPatchMenu = useCallback((agGridEvent: any) => {
    const {event} = agGridEvent;
    const data = agGridEvent.node.data;
    const patchData = data.data;
    const patchKey = agGridEvent.node?.data.name;
    setCurrentPatchName(data.name);
    setCurrentPatchData(patchData);

    if (event) showContextMenu({id: kPatchContextMenu, event, props: {patchData, patchKey, colId: agGridEvent.colId,}});

  }, []);

 return (
  <Modalize $maxWidth={"600px"} >

    <div style={{paddingLeft: '10px'}}>
      Patch Filter: <input id="pfilter" name="pfilter" type="text" value={patchFilter}
                           onChange={event => actions.patch.saveFilter(event.target.value)}/>
    </div>
    <hr/>
    <MyGrid style={gridstyle} contextM={openPatchMenu} dark={false} rowData={patches} columnDefs={patchColumnDefs}
            getRowNodeId={getPatchRowNodeId}>
      <Menu id={kPatchContextMenu}>
        <ContextMenuHeader><span style={{color: 'black'}}>Patch: </span>{currentPatchName}</ContextMenuHeader>
        <Separator/>
        <Item disabled={!currentPatchName} id="1" onClick={() => actions.patch.delete(currentPatchName)}>Delete
          patch</Item>
        <Separator/>
        <Item disabled={!currentPatchName} id="2"
              onClick={() => actions.patch.saveCopyAs(currentPatchName, `${currentPatchName} copy`)}>Duplicate
          patch</Item>
        <Separator/>
      </Menu>
    </MyGrid>
  </Modalize>
);

}
