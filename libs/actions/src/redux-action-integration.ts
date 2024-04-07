import {SliceConfig} from './types';
import {identicalKeys, oReduce} from '@therious/utils';
import { Action, AnyAction, ActionCreator, applyMiddleware, bindActionCreators, combineReducers, Dispatch,
  legacy_createStore as createStore
} from 'redux';

import {composeWithDevTools} from "redux-devtools-extension";

//----- reducers and actions ----
// reason to combine a console statement has to do with exceptions thrown while just loading a module
// making reading the causing exception completely unreliable in the log until that pattern is fixed
function throwIt(s:string, err?:Error)
{
  const error = err ?? new Error(s);
  // console.error(error);  // guarantee it is reported in the log during loading process
  // alert(s);
  throw(error);
}

function validateSlice(slice:SliceConfig)
{
  const identicallyKeyed = identicalKeys(slice.creators, slice.reducers);
  console.log(`validating slice ${slice.name}`);

  if(!identicallyKeyed) {
    console.error(`creators vs keys`, Object.keys(slice.creators).sort(),Object.keys(slice.reducers).sort());
    throwIt(`Slice ${slice.name} does not have identical set of creators and reducers`); // todo better detail later
  }
}
// test combined set of slices for unique names, valid slice names, correctness, etc.
function validateAllSlices(allSlices:SliceConfig[])
{
  // --- slice name police ---
  // --- must have unique names ----

  const allSliceNames = allSlices.map(({name})=>name);
  const uniqueSliceNames = new Set(allSliceNames);
  if(uniqueSliceNames.size !== allSlices.length)
    throwIt(`Not all slices have unique names (${allSliceNames.join(',')})`);

  // ---- slice names must look like basic identifiers starting with lower case letter preferably camel case
  const legalSliceNameRegEx = /^[a-z]+[a-zA-Z0-9_]*$/;
  allSliceNames.forEach(name=>{
    const isLegal = legalSliceNameRegEx.test(name)
    if(!isLegal)
      throwIt(`Slice '${name}' does not conform to pattern ${legalSliceNameRegEx.toString()}`)
  });

  //---- verify there is a creator for every reducer ----
  allSlices.forEach(validateSlice);

}

type reducer = (...rest:any[])=>any;  // todo replace with better type?

const createReducer = (sliceConfig:SliceConfig):reducer => {
  const {initialState, reducers} = sliceConfig;

  const funcs = oReduce(Object.entries(reducers), ([k, v]:[string,any]) => [`${sliceConfig.name}/${k}`, v]);

  return function (state = initialState, action:Action) {
    const actionf = funcs[action.type];
    return actionf ? actionf(state, action) : state;
  }
}


function mapReducers(allSlices:SliceConfig[]) {
  const map:Record<string, reducer>  =  oReduce(allSlices, (slice:SliceConfig) => [slice.name, createReducer(slice)]); // take name and reducers as kv pairs for new map
  return combineReducers(map)
}

// ==== action processing ====

type TypeToCreatorFunc = (...args:any)=>Partial<Action>;
// where the f is a function replace it with a new function that adds correct type to the created object
const addTypeToCreatorFunction = (k:string, f:TypeToCreatorFunc) => (...args:any) => ({type: k, ...f(...args)});

// creator objects are updated, and then returned as immutable consts (doesn't create a unique object each time, since they are the same)
const addTypeToCreatorObject = (k:string, v:ActionCreator<any>) => {
  const creator = {type: k, ...v};
  return () => creator
};

// an alternate simpler version returns a new object each time, but since they don't change
//const addTypeToCreatorObject = (k, v) => () =>({type:k, ...v});

// given all the slices, we need an array of [{name, unboundActions}] which we will later process into a map of {slicename: boundActions} or slicename.actionName
function combineCreators(allSlices:SliceConfig[]) {
  return allSlices.map(slice => {
    const creators:Record<string, any> = {...slice.creators};
    // modify each
    Object.entries(creators).forEach(
      ([k, v]:[string,any]) => creators[k] = (typeof v === 'function') ?
        addTypeToCreatorFunction(`${slice.name}/${k}`, v) :
        addTypeToCreatorObject(`${slice.name}/${k}`, v)
    );
    return {name: slice.name, unboundActions: creators};
  });
}


export function integrate(allSlices:SliceConfig[], allMiddlewares:any[], middlewareInits:any[])
{
  validateAllSlices(allSlices);

  const combinedReducers  = mapReducers(allSlices);
  const allCreatorsArr    = combineCreators(allSlices);

  const actionsInit = (bindf:any)=>oReduce(allCreatorsArr, (o:SliceConfig)=>[o.name, bindf(o.unboundActions)]);

  //----- combine middlewares -----
  const middlewares = applyMiddleware(...allMiddlewares); // make logging last to not record intercepted actions
  const store = createStore(combinedReducers, composeWithDevTools(middlewares));

  // ---- actions (needs: store)
  const bindf = (unbound:any) => bindActionCreators(unbound, store.dispatch as unknown as Dispatch<AnyAction>);
  const actions  = actionsInit(bindf);              // binds all the actions

//---- any middleware that maps to actions must be initialized only after actions are bound ----
// once actions are available initialize middlewares that need additional access
  middlewareInits.forEach((f)=>f(actions));  // middleware needs access to actions, possibly at initialization time

  return {store, actions};
}

// todo starts here
// + kill files actions.js and reducers.js so that all integration happens in actions-integration
// + make a single file that imports all the slices and constructs the overal state type
// + and explicitly lists each slice as a named thing called Slices?  This will be the type of the thing that
// + gives typesafety to whoever accesses the actions

