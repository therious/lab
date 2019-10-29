export function Increment(state, {counter})
{
    const val = state[counter] + 1;
    return  {...state, [counter]:val}
}

export function Decrement(state, {counter})
{
    const val = state[counter] - 1;
    return  {...state, [counter]:val}
}


export const omsVersion = (state)=> state;

export const omsOrderBid = (state, {symbol,party,price,quantity})=> state;
export const omsOrderAsk = (state, {symbol,party,price,quantity})=> state;

export const omsPartyList   = (state)=> state;
export const omsPartyLookup = (state,{tail})=>state;
export const omsPartyCreate = (state,{post,tail})=>state;

export const omsQuoteList = (state)=>state;

export const omsTradeList = (state)=>state;
export const omsTradeListSymbol = (state, {tail})=>state;
export const omsTradeListFromTo = (state, {params})=>state;

export const omsVersionResponse         = (state,{response})=>state;
export const omsOrderBidResponse        = (state,{response})=>state;
export const omsOrderAskResponse        = (state,{response})=>state;
export const omsPartyLookupResponse     = (state,{response})=>state;
export const omsPartyCreateResponse     = (state,{response})=>state;
export const omsTradeListSymbolResponse = (state,{response})=>state;
export const omsTradeListFromToResponse = (state,{response})=>state;

function rdExtractGenerator(keyField)
{
    return function(a,v){a[v[keyField]]=v; return a;}
}

function stateProducer(propName, keyField) {
    const extractorf = rdExtractGenerator(keyField);

    return function(state,{response}) {
        const result = response.data.reduce(extractorf, {});
        return {...state, [propName]:result}
    }
}

export const omsQuoteListResponse       = stateProducer('quotes', 'name');
export const omsTradeListResponse       = stateProducer('trades', 'sequence');
export const omsPartyListResponse       = stateProducer('parties', 'name');
