// crockford inspired extensions, inheritance/extensions for javascript
//------------------------------------------------------------------------------
export const isFunction  = (a:unknown) => typeof a === 'function';
export const isObject    = (a:unknown) => (a && typeof a === 'object') || isFunction(a);
export const isAlien     = (a:unknown) => isObject(a) && typeof a?.constructor !== 'function';
export const isArray     = (a:unknown) => Array.isArray(a);
export const isBoolean   = (a:unknown) => typeof a === 'boolean';
export const isNull      = (a:unknown) => a === null;
export const isNumber    = (a:unknown) => typeof a === 'number' && isFinite(a);
export const isString    = (a:unknown) => typeof a === 'string';
export const isUndefined = (a:unknown) => a === undefined;
export const isScalar =    (a:unknown) =>isNumber(a) || isString(a) || isBoolean(a) || isNull(a) || isUndefined(a);

//------------------------------------------------------------------------------
export const entityify =(s:string):string => s.replace(/&/g, "&amp;").replace(/</g,"&lt;").replace(/>/g, "&gt;");

//------------------------------------------------------------------------------
export const quote = (s:string):string => '"' + s.replace(/(["\\])/g, '\\$1') + '"';

//------------------------------------------------------------------------------
export const trim = (s:string):string => s.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");



export const nada        = ()=>{}

// crockford's object function with more suggestive name
export function inherits(o:any):any {
  function F() {}
  F.prototype = o;
  // @ts-ignore
  return (new F()) as any;
}


/**
 * @param obj Object instance whose class name we want to know
 * @returns string with the Classname where it can be determined
 */

const classRegEx = /^\s*function\s+([A-Za-z0-9_]+)/;  // classes do not look like this
export function classname(o:unknown):string
{
  const ctor = o?.constructor;

  if(!ctor)              {return "~NotAClass~"; }
  const s = ctor.toString();

  if(classRegEx.test(s)) {
    return classRegEx.exec(s)?.[1] ?? "~ShouldNotHappen~";
  } else {
    return "~Can'tParseClassName~";
  }
}


export function getclass(obj:unknown)
{
  const str = typename(obj);
  if(str.match(/^~/))
    return null;
  if(str.match(/(Object|Array)/))
    return "";
  return str;
}

//------------------------------------------------------------------------------
/**
 * if it is anything other than object, returns it
 * @param x  The object instance whose type we want to know
 * @returns string with the object typename or classname
 */
export function typename(x:unknown):string
{
  const t=typeof(x);            // try typeof first
  if(t !== 'object'){ return t;} // if not generic, use it
  return classname(x);        // try classname
}

//------------------------------------------------------------------------------
const $jsident = new RegExp("^[A-Za-z][A-Za-z0-9_]*$", '');
let $serdepth = 0;

// return a string identifying node based on id, if available, or certain famous nodes
export function nodeIdentity(node:Element)
{

  const tag       = node.tagName?  `${node.tagName} `:'';
  const id        = node.id?        `id=${node.id} `: '';
  const classname = node.className? `class="${node.className}" `:'';

  const desc = `<${tag}${id}${classname}/>`;

  if(desc.length > 3)         { return desc;    }

  //@ts-ignore
  if(node === document)       { return '(html)';}
  if(node === document.body)  { return '(body)';}
  if(node === document.head)  { return '(head)';}

  return `(type=${node.nodeType})`;
}

export function serialized(arg:unknown):string {
  let ret = '"*default*"';
  try {

    if(++$serdepth > 6) {
      return '"*recurse*"';
    }

    let  v;
    const o = [];

    const argt = typeof arg;
    switch (argt) {
      case 'object':
        if(arg) {
          // @ts-ignore
          if(arg?.nodeType){
            return `"*${nodeIdentity(arg as Element)}*"`;
          }

          if (Array.isArray(arg)) {
            o.push('[');
            for (let i = 0; i < arg.length; ++i) {
              v = serialized(arg[i]);
              if (v !== undefined && v !== '"function"') {
                o.push(v);
              }
              o.push(',');
            }
            if(o.length > 1) {
              o.pop(); // remove the last comma
            }
            o.push(']');
            return o.join('');
          } else if (typeof arg.toString != 'undefined') {
            o.push('{');
            for (const i in arg) {
              if(Object.prototype.hasOwnProperty.call(arg,i)) {

                //@ts-ignore
                v = serialized(arg[i]);
                if (v !== undefined && v !== '"function"' && v !== '"*recurse*"') {
                  if($jsident.test(i)) {
                    o.push(i);
                  } else {
                    o.push('"', i, '"');
                  }
                  o.push(':', v, ',');
                }
              }
            }
            if(o.length > 1) {
              o.pop(); // remove the last comma
            }
            o.push('}');
            return o.join('');
          } else {
            return '"*weird*"';
          }
        }
        return 'null';
      // case 'unknown':
      case 'undefined':
      case 'function':
        return quote(argt);
      case 'string':
        return quote(arg as string);
      default:
        return String(arg);
    }
  } catch(sexc) {
    ret =  '"*exception*"';
  } finally {
    --$serdepth;
  }
  return ret;
}


export function serialize(arg:unknown) {
  $serdepth = 0;
  return serialized(arg);
}

//------------------------------------------------------------------------------
/**
 * @returns a Javascript object (eval result of the string)
 */
export function deserialize(s:string)
{
  let result;
  return eval("result = " + s);
}




// // copy all named functions from obj proto directly to object
// // has no net effect if function named was already an instance function
// export function instantize(obj:any, methodArray:unknown[])
// {
//   const undone = [];
//   let f;
//   for(let i = 0, len = methodArray.length; i < len; ++i) {
//     const m = methodArray[i];
//     f = obj[m];
//     if(f) { // SIC single =
//       obj[m] = f;
//     }else{
//       undone.push(m);
//     }
//   }
//   return undone;  // return  list of unfound properties
// }
//

// to extract the function name from the resulting code.
export function funcname(f:()=>unknown) {
  const s = f.toString().match(/function (\w*)/)?.[1] ?? null;
  if ((s === null) || (s.length === 0)){ return "~anonymous~";}
  return s;
}


export function failContext() { return " [Failure context-- window: '" + self.name + "', location: '" + self.location + "']"; }
export function failNil(val:unknown, msg:string) { if(!val) { throw new Error(msg + failContext()); }}
export function failType(val:unknown, expected:unknown) {
  const actual = typename(val);
  if(actual !== expected) {
    throw new Error(`Typecheck Error. Expected: ${expected} Actual: ${actual}.${failContext()}`);
  }
}

// example exists(window, 'gfi.gui.Message.add') tests whole property chain safely
// export function exists(root, s, alt)
// {
//   const chain = s.split(/\./);
//   alt = alt || null;
//   let p = root;
//   const len = chain.length;
//
//   for(let i= 0; i< len; ++i) {
//     const t = p? p[chain[i]]: undefined;
//     if(t === undefined) // property non existant
//       return alt;
//     p = t;
//   } // end for each item in chain
//   return p;
// }
//
//------------------------------------------------------------------------------



//------------------------------------------------------------------------------
const Sprintf =
  {
    pad: function(str:string, ch:string, len:number)
    {
      const l2 = Math.abs(len);

      return len > 0? str.padEnd(l2, ch): str.padStart(l2, ch);
    }

    ,processFlags: function(flags:string, width:string, rs: string, arg:unknown)
    {
      const pn = function(flags:string, arg:unknown, rs:string) {
        if((arg as number)>=0){
          if(flags.indexOf(' ')>=0){
            rs = ' ' + rs;
          } else if(flags.indexOf('+')>=0) {
            rs = '+' + rs;
          }
        } else {
          rs = '-' + rs;
        }
        return rs;
      };
      const iWidth = parseInt(width,10);
      if(width.charAt(0) === '0')
      { let ec=0;
        if(flags.indexOf(' ')>=0 || flags.indexOf('+')>=0) {ec++;}
        if(rs.length<(iWidth-ec)){ rs = Sprintf.pad(rs,'0',rs.length-(iWidth-ec));}
        return pn(flags,arg,rs);
      }
      rs = pn(flags,arg,rs);
      if(rs.length<iWidth)
      { if(flags.indexOf('-')<0) {rs = Sprintf.pad(rs,' ',rs.length-iWidth);}
      else{ rs = Sprintf.pad(rs,' ',iWidth - rs.length);}
      }
      return rs;
    }


    ,converters: {

      c: function(flags:string,width:string,precision:string,arg:unknown)
      { if(typeof(arg) == 'number'){ return String.fromCharCode(arg);}
        if(typeof(arg) == 'string'){ return arg.charAt(0);}
        return '';
      }
      ,d: function(flags:string,width:string,precision:string,arg:unknown)
      { return Sprintf.converters.i(flags,width,precision,arg);
      }
      ,u: function(flags:string,width:string,precision:string,arg:unknown)
      { return Sprintf.converters.i(flags,width,precision,Math.abs(arg as number));
      }
      ,i:  function(flags:string,width:string,precision:string,arg:unknown)
      { const iPrecision=parseInt(precision,10);
        let rs = ((Math.abs(arg as number)).toString().split('.'))[0];
        if(rs.length<iPrecision){ rs=Sprintf.pad(rs,' ',iPrecision - rs.length);}
        return Sprintf.processFlags(flags,width,rs,arg);
      }
      ,E: function(flags:string,width:string,precision:string,arg:unknown)
      { return (Sprintf.converters.e(flags,width,precision,arg)).toUpperCase();
      }
      ,e:  function(flags:string,width:string,precision:string,arg:unknown)
      { let iPrecision = parseInt(precision,10);
        if(isNaN(iPrecision)) {iPrecision = 6;}
        let rs = (Math.abs(arg as number)).toExponential(iPrecision);
        if(rs.indexOf('.')<0 && flags.indexOf('#')>=0){ rs = rs.replace(/^(.*)(e.*)$/,'$1.$2');}
        return Sprintf.processFlags(flags,width as string,rs,arg);
      }
      ,f: function(flags:string,width:string,precision:string,arg:unknown)
      { let iPrecision = parseInt(precision,10);
        if(isNaN(iPrecision)) {iPrecision = 6;}
        let rs = (Math.abs(arg as number)).toFixed(iPrecision);
        if(rs.indexOf('.')<0 && flags.indexOf('#')>=0) {rs = rs + '.';}
        return Sprintf.processFlags(flags,width,rs,arg);
      }
      ,G: function(flags:string,width:string,precision:string,arg:unknown)
      { return (Sprintf.converters.g(flags,width,precision,arg)).toUpperCase();
      }
      ,g: function(flags:string,width:string,precision:string,arg:unknown)
      { const iPrecision = parseInt(precision,10);
        const absArg = Math.abs(arg as number);
        let rse = absArg.toExponential();
        let rsf = absArg.toFixed(6);
        if(!isNaN(iPrecision))
        { const rsep = absArg.toExponential(iPrecision);
          rse = rsep.length < rse.length ? rsep : rse;
          const rsfp = absArg.toFixed(iPrecision);
          rsf = rsfp.length < rsf.length ? rsfp : rsf;
        }
        if(rse.indexOf('.')<0 && flags.indexOf('#')>=0) {rse = rse.replace(/^(.*)(e.*)$/,'$1.$2');}
        if(rsf.indexOf('.')<0 && flags.indexOf('#')>=0) {rsf = rsf + '.';}
        const rs = rse.length<rsf.length ? rse : rsf;
        return Sprintf.processFlags(flags,width,rs,arg);
      }
      ,o: function(flags:string,width:string,precision:string,arg:unknown)
      { const iPrecision=parseInt(precision,10);
        let rs = Math.round(Math.abs(arg as number)).toString(8);
        if(rs.length<iPrecision){ rs=Sprintf.pad(rs,' ',iPrecision - rs.length);}
        if(flags.indexOf('#')>=0) {rs='0'+rs;}
        return Sprintf.processFlags(flags,width,rs,arg);
      }
      ,X: function(flags:string,width:string,precision:string,arg:unknown)
      { return (Sprintf.converters.x(flags,width,precision,arg)).toUpperCase();
      }
      ,x: function(flags:string,width:string,precision:string,arg:unknown)
      { const iPrecision=parseInt(precision,10);
        arg = Math.abs(arg as number);
        let rs = Math.round(arg as number).toString(16);
        if(rs.length<iPrecision) {rs=Sprintf.pad(rs,' ',iPrecision - rs.length);}
        if(flags.indexOf('#')>=0) {rs='0x'+rs;}
        return Sprintf.processFlags(flags,width,rs,arg);
      }
      ,s: function(flags:string,width:string,precision:string,arg:unknown)
      { const iPrecision=parseInt(precision,10);
        let rs:string = arg as string;
        if(rs.length > iPrecision){ rs = rs.substring(0,iPrecision);}
        return Sprintf.processFlags(flags,width,rs,0);
      }
      ,z: function(flags:string,width:string,precision:string,arg:unknown)
      {
        const iPrecision=parseInt(precision,10);
        let rs = serialize(arg);
        if(rs.length > iPrecision) {rs = rs.substring(0,iPrecision);}
        return Sprintf.processFlags(flags,width,rs,0);
      }
    }
  };

export function sprintf(fstring:string, ...rest:unknown[]):string {
  if (fstring) {
    if (!isString(fstring)) {
      throw new Error("sprintf(fmtstr): fmtstr not a string");
    }
    try {
      const farr = fstring.split('%');
      let retstr = farr[0];
      const fpRE = /^([-+ #]*)(\d*)\.?(\d*)([cdieEfFgGosuxXz])(.*)$/;
      let fps;

      for (let i = 0; i < farr.length - 1; ++i) {
        fps = fpRE.exec(farr[i+1]);
        if (!fps) {
          continue;
        }
        // eslint-disable-next-line prefer-rest-params
        if (rest[i] != null) {
          // @ts-ignore
          retstr += Sprintf.converters[fps[4]](fps[1], fps[2], fps[3], rest[i]);
        }
        retstr += fps[5];
      }
      return retstr;

    } catch (exc) {
      return fstring;
    }
  } else {
    return '';
  }
}
//--------------------------------------------------------------------------


//================== end sprintf

const re   = /^\s*function\s+([A-Za-z0-9_]+\s*\([^)]*\))/;
const anon = /^\s*function\s*(\([^)]*\))/;

/**
 *
 * @param o  code for function, from which to extract function name
 * @returns name of the function
 */
// export function extractFuncName(o)
// {
//   const s = o.toString();  // just incase it isn't already a string
//   if(re.test(s)) {
//     return re.exec(s)?.[1];
//   } else if(anon.test(s)) {
//     return 'anon' + anon.exec(s)?.[1];
//   }
//   return "~func~";
// }


// iterate a function over a property which may or may not be an array
export function iterateF(p:unknown, f:(p:unknown)=>unknown)
{
  if(p !== undefined){
    if(Array.isArray(p)) { //p.constructor === Array) {
      for(let i = 0, len = p.length; i < len; ++i) {
        f(p[i]);
      }
    } else {
      f(p);
    }   // end if
  } // end if there is object
}

// iterate F with a break after first function to return something other than undefined
export function iterateFB(p:unknown, f:(p:unknown)=>unknown)
{
  let r;
  if(p !== undefined){
    if(Array.isArray(p)) { //if(p.constructor === Array) {
      for(let i = 0, len = p.length; i < len; ++i) {
        r = f(p[i]);
        if(r !== undefined) {break;}
      }
    } else {
      r = f(p);
    }   // end if
  } // end if there is object
  return r;
}

