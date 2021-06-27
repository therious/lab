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

// generate an accumulator function to use with reduce that maps all object values to a specified keyfield in that value
function rdExtractGenerator(keyField)
{
    return function(a,v){
        const id = v[keyField];
        v.id = id;   // add canonical id field, used by row objects  (todo: temporary antipattern this)
        a[id]=v;
        return a;
    }
}

// generate a reducer that
// accepts a response.data array of objects, reducing it and returning accumulated result in propName
// accepts a response.data array of objects, reducing it and returning accumulated result in propName
// accepts a response.data array of objects, reducing it and returning accumulated result in propName
// the reducer takes the keyField, and assigns each value to the key field in the accumulator
function stateProducer(propName, keyField) {
    const extractorf = rdExtractGenerator(keyField);

    return function(state,{response}) {
        const result = response.data.reduce(extractorf, {});
        return {...state, [propName]:result}
    }
}

export const simpleValue = () => (state, action) => ({...state, [action.type]:action.value});

export const omsQuoteListResponse       = stateProducer('quotes', 'name');
export const omsTradeListResponse       = stateProducer('trades', 'sequence');
export const omsPartyListResponse       = stateProducer('parties', 'name');

export const pickGrid = (state, {value})=>({...state, pickGrid:value});
export const ToggleLeft =(state, {expanded})=>({...state, layout: {...state.layout, left: state.layout.left? 0: expanded}});
export const ToggleRight =(state, {expanded})=>({...state, layout: {...state.layout, right: state.layout.right? 0: expanded}});
