import {tsToDate, tsToTime} from "./datexforms";

const defCol = {
    sortable:true,
    filter:true
};



function toAgColDef(v) {

    if(typeof v === 'string')
       return {...defCol, headerName:v.toUpperCase(), field:v};

    const o = {...v};

    o.headerName = o.h.toUpperCase();
    o.field = o.f;
    delete o.f;
    delete o.h;

    return {...defCol, ...o};

}


const tradeListColumns = [
    'sequence',
    {f:'timestamp', h:'Date'}, //valueFormatter: tsToDate
    {f:'timestamp', h:'Time'}, //valueFormatter: tsToTime
    'symbol',
    'price',
    'quantity'];

const quoteColumns = [
    {f:'name', h:'name'},
    {f:'bid', h:'bid'},
    {f:'ask', h:'ask'}
];

const partyColumns = [
    'name'
];


const columnDefsPreXform = {
    Trades:tradeListColumns,
    Quotes:quoteColumns,
    Parties:partyColumns
};

export const columnDefsMap = Object.entries(columnDefsPreXform).reduce((a,[k,v])=>{
    a[k]=v.map(o=>toAgColDef(o)); // xform abbrievated column definitions to AgGrid spec columnDefinitions
    return a;
},{});
