export const increment = (counter)=>({type:'Increment', counter});
export const decrement = (counter)=>({type:'Decrement', counter});


export const omsVersion = ()=> ({type:'omsVersion', get:'/version'});

export const omsOrderBid = (symbol,party,price,quantity)=> ({type:'omsOrderBid', post:'/order/bid', body:{symbol,party,price,quantity}});
export const omsOrderAsk = (symbol,party,price,quantity)=> ({type:'omsOrderAsk', post:'/order/ask', body:{symbol,party,price,quantity}});

export const omsPartyList   = ()=> ({type:'omsPartyList',      get:1});
export const omsPartyLookup = (id)=>({type:'omsPartyLookup',   get:1, tail:id});
export const omsPartyCreate = (id)=> ({type:'omsPartyCreate',  post:1, tail:id});

export const omsQuoteList = (id)=> ({type:'omsQuoteList', get:1});

export const omsTradeList = ()=> ({type:'omsTradeList', get:1});
export const omsTradeListSymbol = (id)=> ({type:'omsTradeListSymbol', get:'/trade/list', tail:id});
export const omsTradeListFromTo = (from,to)=> ({type:'omsTradeListFromTo', get:1, params:{from,to}});


export const omsVersionResponse         = (response)=> ({type:'omsVersionResponse',         response});
export const omsOrderBidResponse        = (response)=> ({type:'omsOrderBidResponse',        response});
export const omsOrderAskResponse        = (response)=> ({type:'omsOrderAskResponse',        response});
export const omsPartyListResponse       = (response)=> ({type:'omsPartyListResponse',       response});
export const omsPartyLookupResponse     = (response)=> ({type:'omsPartyLookupResponse',     response});
export const omsPartyCreateResponse     = (response)=> ({type:'omsPartyCreateResponse',     response});
export const omsQuoteListResponse       = (response)=> ({type:'omsQuoteListResponse',       response});
export const omsTradeListResponse       = (response)=> ({type:'omsTradeListResponse',       response});
export const omsTradeListSymbolResponse = (response)=> ({type:'omsTradeListSymbolResponse', response});
export const omsTradeListFromToResponse = (response)=> ({type:'omsTradeListFromToResponse', response});
