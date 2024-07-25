// given an an api triggering action, asssign a reqId, and  name of its response and error actions
import {elapsedSinceReqId, reqIdGenerate, oReduce} from '@therious/utils';

import {ErrorMeta, ResponseMeta, SliceConfig} from './types';
import {PNoticeNoKey} from './notify-slice';

const middlestyle = `
    padding: 2px 8px;
    border: 1px solid black;
    background-color:salmon;
    color: black;
    `;

export function logApiCall(aType:string, url:string, method:string ='') {

  console.log(`%c ${aType} sends ${method? method.toUpperCase() + ': ':''}${url}`, middlestyle);
}

export const calcReqIdAndResponseTypes = (aType:string, sliceConfig:SliceConfig) => {
  const tType =  aType.slice(sliceConfig.name.length + 1);

  return {
    tType,
    reqId: reqIdGenerate(), // generate a unique request identifier
    rAction: (tType + 'Response'),  // take off the prefix since we are exporting symbols in flat space no prefix
    reAction: (tType + 'Error'),    // error responses coming from api (like non-200 values)
    eAction: (tType + 'Exception'), // request level exceptions
  }
};


export const createResponseMeta = (reqId:string):ResponseMeta => {
  const {elapsedMicros, elapsedStr: elapsed} = elapsedSinceReqId(reqId);
  return  {reqId, elapsed, elapsedMicros};
}

// error information includes properties of error, reqId and elapsed time since request was made
export const createErrorMeta = (reqId:string, error:Error):ErrorMeta => {
  const {name='',message,stack=''} = error;
  return {...createResponseMeta(reqId), name, message, stack };
}

// a utility for generating urls
const camelCaseRegEx = /([a-z0-9]|(?=[A-Z]))([A-Z])/g;
export const typeToPath = (tType:string) => tType.replace(camelCaseRegEx, '$1/$2').toLowerCase();

export type TriggerMap = Record<string,boolean>;
export type ActionMap = Record<string,unknown>;

// given a set of mappable actions (where they are mostly api calls,responses, errors, etc
// create a map of actions that would trigger api calls (and ignore responses,errors, exceptions
// also anything explicitly blacklisted should not appear in final map
// this speeds up dispatching by recognizing the api calls in advance, and it gives us a tool to apply
// other special processing at initialization time rather than run time
export const mapTriggers = (sliceConfig:SliceConfig, actionMap:ActionMap,  triggerBlacklist?:TriggerMap): TriggerMap=> {

  const triggerMap:TriggerMap = oReduce(Object.keys(actionMap), (k:string)=>[
    `${sliceConfig.name}/${k}`,                                                        //key
    !(k.endsWith('Response') || k.endsWith('Error')    || k.endsWith('Exception'))     //value
  ]);

  if(triggerBlacklist)
    Object.keys(triggerBlacklist).forEach((k)=>delete triggerMap[k]);

  return triggerMap;
}


const note = (kind:string, reqId:string, aType:string, msg:string): PNoticeNoKey => {
  const reqNum = reqId.split('=')[1]; // take part of the request id after the equals sign (with request number)
  return  {
    msg:`req#:${reqNum} action: ${aType} -- ${msg}`,
    kind,
    remedy: 'Review'
  }
}

export const resolvedResponse = (sliceConfig:SliceConfig, mActions:any, requestActions: any, notifyActions: any, rAction: string, reAction: string, reqId: any, response: any) => {
  // todo differentiate errorResponses (like non 200 status) and exceptions

  const respMeta = createResponseMeta(reqId);
  try {

    //200 success 201 created 202 accepted 203 Non authoritative (unlikely in our case) 204 No content
    // if there are calls that update something and don't expect data back other than status, they should not try
    // to access response.data, since it will be empty
    if(response.status >= 200 && response.status <= 204) {
      mActions[rAction](response, respMeta);
      requestActions.closeRequestR(respMeta);

    } else {
      // error information includes properties of error, reqId and elapsed time since request was made
      // put in http status, etc.

      const message = `status: ${response.status} - ${response.statusText}: url:${response.config.url}`;


      const errorMeta = createErrorMeta(reqId, {name:`${response.status} - ${response.statusText}`, stack: '', message});
      console.error(`${reAction} reqId:${reqId} api returns error after: ${respMeta.elapsed}`, errorMeta);

      // run either specific or generic api error handler
      (mActions[reAction] ?? mActions['catchAllError'])(errorMeta);
      requestActions.closeRequestE(errorMeta);
      notifyActions.warn(note(sliceConfig.name, reqId,rAction, errorMeta.message))
    }

  } catch(err:any) {
    // something that just should not happen ever should trigger a fatal notification
    const msg = `response action error '${rAction}' either doesn't exist or it throws an exception, msg=${err.message}`;
    notifyActions.fatal(note(sliceConfig.name,reqId,rAction, msg));
    throw(err); // rethrow for stack sake?
  }

  return response;
}

export const catchResponse = (sliceConfig:SliceConfig, mActions:any, requestActions: any, notifyActions: any, eAction: string, reqId: string, oAction: string, error: Error) => {

  // error information includes properties of error, reqId and elapsed time since request was made
  const errorMeta = createErrorMeta(reqId, error);

  console.error(`${eAction} reqId:${reqId} exception after: ${errorMeta.elapsed}`, errorMeta);

  (mActions[eAction] ?? mActions['catchAllException'])(errorMeta);
  requestActions.closeRequestE(errorMeta);

  const reqNum = reqId.split('=')[1]; // take part of the request id after the equals sign (with request number)

  // now report it with the original action that created the request to understand the notification better
  notifyActions.error({ kind: sliceConfig.name, remedy: 'Review', msg: `req#:${reqNum} action: ${oAction} -- ${errorMeta.message}` });
};

