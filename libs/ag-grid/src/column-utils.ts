// default column properties to be overridden
const defCol = { sortable:true, filter:true, enableCellChangeFlash:true};

// convert our compact column definition to ag-grid column definition
export function toAgColDef(v:any):any {

  if(typeof v === 'string')
    return {...defCol, headerName: v.toUpperCase(), field: v};

  const o = {...v};

  o.headerName = (o.h||o.f).toUpperCase();
  o.field = o.f;
  delete o.f;  // todo this is non-functional, this delete stuff
  delete o.h;

  return {...defCol, ...o};

}

