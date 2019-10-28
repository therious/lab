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
export const omsPartyListResponse       = (state,{response})=>state;
export const omsPartyLookupResponse     = (state,{response})=>state;
export const omsPartyCreateResponse     = (state,{response})=>state;
export const omsQuoteListResponse       = (state,{response})=>state;
export const omsTradeListResponse       = (state,{response})=>state;
export const omsTradeListSymbolResponse = (state,{response})=>state;
export const omsTradeListFromToResponse = (state,{response})=>state;
