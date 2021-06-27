import {tsToDate, tsToTime} from "./datexforms";
import {isNumber} from "luxon/src/impl/util";

const vgTsToTime = (params)=>isNumber(params.value)? tsToTime(params.value):undefined;
const vgTsToDate = (params)=>isNumber(params.value)?  tsToDate(params.value):undefined;
const priceFormatter = (params)=>isNumber(params.value)? params.value.toFixed(2):undefined;

const defCol = {
    sortable:true,
    filter:true,
    enableCellChangeFlash:true,

};



function toAgColDef(v) {

    if(typeof v === 'string')
       return {...defCol, headerName:v.toUpperCase(), field:v};

    const o = {...v};


    o.headerName = (o.h||o.f).toUpperCase();
    o.field = o.f;
    delete o.f;
    delete o.h;

    return {...defCol, ...o};

}


const tradeListColumns = [
    'sequence',
    {f:'timestamp', h:'Date', valueFormatter: vgTsToDate}, //valueFormatter: tsToDate
    {f:'timestamp', h:'Time', valueFormatter: vgTsToTime}, //valueFormatter: tsToTime
    {f:'symbol'},
    {f:'price', valueFormatter:priceFormatter},
    'quantity'
];

const quoteColumns = [
    'name',
    {f:'bid', valueFormatter:priceFormatter},
    {f:'ask', valueFormatter:priceFormatter}
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
