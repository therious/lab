import {oReduce} from '@therious/utils';
import {ResponseMeta, Creators, EmptyObject} from './types';

export const noParamsCreator:EmptyObject = {};

export const responseCreator = (response: any, respMeta:ResponseMeta) => ({ response, respMeta });

export const noChange = <T>(s: T) => s;  // a do nothing reducer used for api actions that don't change state

// this takes a Record<string, Creator> and returns a Record<string, Reducer>
// used as a utility to build do-nothing reducers for api actions that don't change state
export const noChangeReducers = <T extends Creators>(creators:T)=>oReduce(Object.keys(creators),k=>[k, noChange]);

export const queryParams = (response:any):Record<string,any> =>
  Object?.fromEntries([...new URLSearchParams(response?.config?.url)]) || {};
