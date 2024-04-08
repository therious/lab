
export function deprecate(target: any, context:any):any {
  if (context.kind === "method") {
    return function (...args: any[]) {
      console.log(`${context.name} is deprecated and will be removed in a future version.`);
      return target(...args);
    }
  }
}

interface AsyncOptions {
  async?:boolean;
}

interface ThrowOptions extends AsyncOptions {
  failsIf?: undefined | ((result:unknown) => boolean) | any; // if undef, throw on undef, if function, evaludate, otherwise just compare
  succeedsIf?:((result:unknown) => boolean) | any; // if not specified, inapplicable, used if easier to define success than failure
  message?: string;
}

interface LogOptions extends AsyncOptions {
  before?: boolean;
  after?: boolean
  level?: 'debug' | 'info' | 'warn'|'error'|'log';
  prefix?: string; // string to prefix any logged messages

}

type SomeFunc = (...rest:any[]) => any;

function throwEval(result:unknown, funcName:string, options:ThrowOptions)
{
  const errorMessage = options.message ?? `${funcName}() returns invalid result`;
  const {succeedsIf, failsIf} = options;

  if(succeedsIf) {
    if('failsIf' in options) throw new Error(`${funcName} may not specify both failsIf and succeedsIf conditions`);
    if(succeedsIf === result || ((typeof succeedsIf === 'function') && succeedsIf(result))) return result;
    else throw new Error(errorMessage);

    // specifying nothing makes failsIf undefined, whic is the default condition for throwing exception
    // if neither failsIf nor succeedsIf is specified
   } else if((failsIf === result)  || ((typeof failsIf === 'function') && failsIf(result)))
      throw new Error(errorMessage);
}

function throwWrap(f:SomeFunc, funcName: string, options:ThrowOptions)
{
  let resultf;
  const {async} = options;

  if(async || f.constructor.name === 'AsyncFunction') {
    resultf = async function (...rest:unknown[]) {
      const result = await f(...rest);
      throwEval(result, funcName, options);
      return result
    }

  } else {

    resultf = async function (...rest:unknown[]) {
      const result = f(...rest);
      throwEval(result, funcName, options);
      return result
    }

  }

  return resultf;
}

export function ThrowsIf(options: ThrowOptions={})
{
  return (target:any, propertyKey:string, descriptor:TypedPropertyDescriptor<SomeFunc>) =>{
    descriptor.value = throwWrap(<SomeFunc>descriptor.value, propertyKey, options);
  }

}


function logWrap(f:SomeFunc, funcName:string, options:LogOptions) {
  let resultf;
  const {async} = options;

  let {before = false, after = false, prefix = '', level = 'log'} = options;
  if(prefix) prefix += ' '; // add a space after prefix
  // if not specified if before or after, treat it as before
  // still possible to disable messages by explicitly making them both false, but leaving decorator in place
  // for future use with less fuss

  if(!('before' in options) && !('after' in options))
    before = true;

  if(async || f.constructor.name === 'AsyncFunction') {
    resultf = async function (...rest:unknown[]) {
      if(before) console[level](`${prefix}${funcName}() called with parameters`, ...rest);
      const result = await f(...rest);
      if(after) console[level](`${prefix}${funcName}() returns with`, result);
      return result;
    }
  } else {
    resultf = async function (...rest:unknown[]) {
      if(before) console[level](`${prefix}${funcName}() called with parameters`, ...rest);
      const result = f(...rest);
      if(after) console[level](`${prefix}${funcName}() returns with`, result);
      return result;
    }
  }
  return resultf;
}


export function Log(options: LogOptions={})
{
  return (target:any, propertyKey:string, descriptor:TypedPropertyDescriptor<SomeFunc>) =>{
    descriptor.value = logWrap(<SomeFunc>descriptor.value, propertyKey, options);
  }
}
