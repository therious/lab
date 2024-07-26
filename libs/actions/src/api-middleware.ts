import axios from 'axios';
import {oReduce, delay, firstArgs} from '@therious/utils';

import {SliceConfig} from './types';
import {PNoticeNoKey} from './notify-slice';
import {calcReqIdAndResponseTypes, typeToPath, mapTriggers, resolvedResponse, catchResponse, logApiCall} from './middleware-utils';

export const createApiMiddleware = (baseUrl:string, sliceConfig:SliceConfig, timeout:number) => {
  let apiActions: any;
  let requestActions: any;
  let notifyActions: any;

  let triggersApiMap: Record<string, boolean>;

//  this middleware needs access to other actions
  const apiMiddlewareInit = (actions: any) => {
    apiActions = actions[sliceConfig.name]; // there must be an api slice
    requestActions = actions.request;
    notifyActions = actions.notify;
    triggersApiMap = mapTriggers(sliceConfig, apiActions, triggerApiBlackList);
  };


  type DelayApiFunc = (aType: string) => number;

// @ts-ignore need better switch to disable complaint about unused functions or locals, etc.
  const quirksAndDelays = (apiCalls: string[] | '*', delayInMillis: number, failEveryN: number): DelayApiFunc => {
    const map = typeof apiCalls === 'string' ? undefined : oReduce(apiCalls, (s: string) => [s, 1]);

    let quirkCtr = 0;
    return function (aType: string) {
      if (!map || map[aType]) {
        if ((++quirkCtr % failEveryN) === 0)
          throw new Error(`Quirk Exception for ${aType}`);
        return delayInMillis;
      }
      return 0;
    }

  }

  const calcDelay = (_aType: string) => 0;  // all api calls work as normal no delays no induced exceptions

// this version delays all call results by three seconds that are not exceptions, and makes every third call an exception
// const calcDelay =quirksAndDelays('*', 3000, 3);

// this version makes only matching api calls fail
// const calcDelay =quirksAndDelays(['api/fetchProfile'], 3000, 3);


  function createUrl(tType: string, action: any, method: any) {
    const actMethod = action[method];            // either a string or just truthy value
    const path = (typeof (actMethod) === 'string') ? actMethod : typeToPath(tType);
    const tailPath = action.tail ? '/' + action.tail : '';
    return `${baseUrl}${path}${tailPath}`;
  }

  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout,
    validateStatus: (_status: number) => true  // allow any status that comes back to be handled as valid/error/or exception
  };

// the blackList is for the rare api slice manipulating call that does actually call an api
// an example would be when we know we need to reset a cache updated with api calls, but
// there is no corresponding api for that since cache is entirely local to us
  const triggerApiBlackList = {
    // [`${sliceConfig.name}/feedReset`]:true,
    // [`${sliceConfig.name}/companyFeedReset`]:true,
    // [`${sliceConfig.name}/userFeedReset`]:true
  };
// export type TriggerApiBlacklist = string[];

  const triggersApi = (aType: string): boolean => triggersApiMap[aType] || false;

  const methods: methodType[] = ['get', 'post', 'patch', 'put', 'delete'];
  type methodType = 'get' | 'post' | 'patch' | 'put' | 'delete';

  function calcMethod(action: any): methodType {
    for (let i = 0, len = methods.length; i < len; ++i) {
      const method = methods[i];
      if (action[method])
        return method;
    }
    return 'get'; // todo ^^^ should throw here
  }


  const wouldBeApiLooksSuspicious = (url: string, action: any): boolean =>
    url.includes('undefined') ||
    !!(action?.body && Object.values(action.body).find(v => v === undefined || v === null));

// todo better way to make middleware act only on its slice
  const apiMiddleware = (store: any) => (next: any) => (action: any) => {
    const aType = action.type || '';
    if (!triggersApi(aType))
      return next(action);                           // move to next middleware as quickly as possible

    // we are triggering an api call, need to map reponse/error/exception actions prior to making it
    // and (this is new) we have to ensure enough information is available to triggering action to put futures in addressed items
    // so they can fail to render, but std fallback renderers can find associated request information to know the data is pending or request has failed
    // we are starting with an example api fetchProfile to prove this works other api opening actions probably ignore this for now
    const {tType, reqId, rAction, reAction, eAction} = calcReqIdAndResponseTypes(aType, sliceConfig);
    const method = calcMethod(action);


    const url = createUrl(tType, action, method);

    if (wouldBeApiLooksSuspicious(url, action)) {
      const msg = `${url} (url or body contains undefined or null)`;
      notifyActions.warn({
        kind: sliceConfig.name,
        remedy: 'Dismiss',
        msg: `action: ${aType} - preventing suspicious api call: ${msg} `
      } as PNoticeNoKey);
      return;
    }

    const responsef = firstArgs(resolvedResponse, sliceConfig, apiActions, requestActions, notifyActions, rAction, reAction, reqId);  // determine the reponse function to call
    const catchf = firstArgs(catchResponse, sliceConfig, apiActions, requestActions, notifyActions, eAction, reqId, aType);

    // todo we are going to need an access token
    // const accessToken = store.getState().auth.accessToken;
    const config = {...axiosConfig, headers: {...action.headers, /*Authorization: `Bearer ${accessToken}`*/}};

    logApiCall(aType, url, method);
    const params = action.params;

    // all methods accounted for, no default which produces a sup
    switch (method) {
      case 'post':
      case 'patch':
      case 'put':
        axios[method](url, {...action.body}, config).then(delay(calcDelay(aType))).then(responsef).catch(catchf);
        break;
      case 'delete':
      case 'get':
        axios[method](url, {...config, ...(params)}).then(delay(calcDelay(aType))).then(responsef).catch(catchf);
    }
    requestActions.openRequest({...action, reqId, url});
    // open request first, then run api triggering action to apply proxy
    // this way querystate after action is triggered can find requests by id in request slice
    return next({...action, reqId});  // decorate triggered apis triggering calls with requestIds, so they can post requestid in place of data

  };

  return {apiMiddleware, apiMiddlewareInit};
};
