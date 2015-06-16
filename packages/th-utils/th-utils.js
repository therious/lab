

// crockford inspired extensions, inheritance/extensions for javascript
//------------------------------------------------------------------------------
function isFunction(a) {return typeof a === 'function';                           }
function isObject(a)   {return (a && typeof a === 'object') || isFunction(a);     }
function isAlien(a)    {return isObject(a) && typeof a.constructor !== 'function';}
function isArray(a)    {return a && a.constructor === Array;                      }
function isBoolean(a)  {return typeof a === 'boolean';                            }
function isNull(a)     {return a === null;                                        }
function isNumber(a)   {return typeof a === 'number' && isFinite(a);              }
function isString(a)   {return typeof a === 'string';                             }
function isUndefined(a){return a === undefined;                                   }

function nada() {}

// crockford's object function with more suggestive name
function inherits(o) {
  function F() {}
  F.prototype = o;
  return new F();
}


/**
 * @param obj Object instance whose class name we want to know
 * @returns string with the Classname where it can be determined
 */

var $classRegEx = /^\s*function\s+([A-Za-z0-9_]+)/;
function classname(o)
{
  var ctor = null;

  if(o && o.constructor) {ctor = o.constructor;}
  if(!ctor)              {return "~NotAClass~"; }
  var s = ctor.toString();

  if($classRegEx.test(s)) {
    return $classRegEx.exec(s)[1];
  } else {
    return "~Can'tParseClassName~";
  }
}
//------------------------------------------------------------------------------
/**
 * if it is anything other than object, returns it
 * @param x  The object instance whose type we want to know
 * @returns string with the object typename or classname
 */
function typename(x)
{
  var t=typeof(x);            // try typeof first
  if(t != 'object'){ return t;} // if not generic, use it
  return classname(x);        // try classname
}

//------------------------------------------------------------------------------
var $jsident = new RegExp("^[A-Za-z][A-Za-z0-9_]*$", '');
var $serdepth = 0;

// return a string identifying node based on id, if available, or certain famous nodes
function nodeIdentity(node)
{
  var desc = '<';
  if(node.tagName){
    desc += node.tagName;
  }
  if(node.id) {
    desc += ' id="'  + node.id + '"';
  }
  if(node.className) {
    desc += ' class="' + node.className + '"';
  }
  desc += '/>';
  if(desc.length > 3)         { return desc;    }
  if(node === document)       { return '(html)';}
  if(node === document.body)  { return '(body)';}
  if(node === document.header){ return '(head)';}
  return '(type=' + node.nodeType+')';
}

function serialized(arg) {
  var ret = '"*default*"';
  try {

    if(++$serdepth > 6) {
      return '"*recurse*"';
    }

    var i, v;
    var o = [];

    var argt = typeof arg;
    switch (argt) {
      case 'object':
        if(arg) {
          if(arg.nodeType){
            return '"*' + nodeIdentity(arg) + '*"' ;}

          if (arg.splice) {
            o.push('[');
            for (i = 0; i < arg.length; ++i) {
              v = serialized(arg[i]);
              if (v !== undefined && v != '"function"') {
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
            for (i in arg) {
              if(arg.hasOwnProperty(i)) {
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
      case 'unknown':
      case 'undefined':
      case 'function':
        return argt.quote();
      case 'string':
        return arg.quote();
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


function serialize(arg) {
  $serdepth = 0;
  return serialized(arg);
}

//------------------------------------------------------------------------------
/**
 * @returns a Javascript object (eval result of the string)
 */
function deserialize(s)
{
  var result;
  return eval("result = " + s);
}




// copy all named functions from obj proto directly to object
// has no net effect if function named was already an instance function
function instantize(obj, methodArray)
{
  var undone = [];
  var f;
  for(var i = 0, len = methodArray.length; i < len; ++i) {
    var m = methodArray[i];
    f = obj[m];
    if(f) { // SIC single =
      obj[m] = f;
    }else{
      undone.push(m);
    }
  }
  return undone;  // return  list of unfound properties
}


// to extract the function name from the resulting code.
function funcname(f) {
  var s = f.toString().match(/function (\w*)/)[1];
  if ((s === null) || (s.length === 0)){ return "~anonymous~";}
  return s;
}


function failContext() { return " [Failure context-- window: '" + self.name + "', location: '" + self.location + "']"; }
function failNil(val, msg) { if(!val) { throw new Error(msg + failContext()); }}
function failType(val, expected) {
  var actual = typename(val);
  if(actual != expected) {
    throw new Error('Typecheck Error. Expected: ' + expected   + ' Actual: ' + actual + '.' + failContext());
  }
}

// example exists(window, 'gfi.gui.Message.add') tests whole property chain safely
function exists(root, s, alt)
{
  var chain = s.split(/\./);
  alt = alt || null;
  var p = root;
  var len = chain.length;

  for(var i= 0; i< len; ++i) {
    var t = p? p[chain[i]]: undefined;
    if(t === undefined) // property non existant
      return alt;
    p = t;
  } // end for each item in chain
  return p;
}

//------------------------------------------------------------------------------
String.prototype.entityify=function()
{
  return this.replace(/&/g, "&amp;").replace(/</g,"&lt;").replace(/>/g, "&gt;");
};
//------------------------------------------------------------------------------
String.prototype.quote=function()
{
  return '"' + this.replace(/(["\\])/g, '\\$1') + '"';
};
//------------------------------------------------------------------------------
String.prototype.trim=function()
{
  return this.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
};
//------------------------------------------------------------------------------



//------------------------------------------------------------------------------
var Sprintf =
{
  pad: function(str,ch,len)
  { var ps='';
    var l2 = Math.abs(len);
    for(var i=0; i<l2; ++i) {ps+=ch;}
    return len>0?str+ps:ps+str;
  }

  ,processFlags: function(flags,width,rs,arg)
{
  var pn = function(flags,arg,rs) {
    if(arg>=0){
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
  var iWidth = parseInt(width,10);
  if(width.charAt(0) == '0')
  { var ec=0;
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

  c: function(flags,width,precision,arg)
  { if(typeof(arg) == 'number'){ return String.fromCharCode(arg);}
    if(typeof(arg) == 'string'){ return arg.charAt(0);}
    return '';
  }
  ,d: function(flags,width,precision,arg)
  { return Sprintf.converters.i(flags,width,precision,arg);
  }
  ,u: function(flags,width,precision,arg)
  { return Sprintf.converters.i(flags,width,precision,Math.abs(arg));
  }
  ,i:  function(flags,width,precision,arg)
  { var iPrecision=parseInt(precision,10);
    var rs = ((Math.abs(arg)).toString().split('.'))[0];
    if(rs.length<iPrecision){ rs=Sprintf.pad(rs,' ',iPrecision - rs.length);}
    return Sprintf.processFlags(flags,width,rs,arg);
  }
  ,E: function(flags,width,precision,arg)
  { return (Sprintf.converters.e(flags,width,precision,arg)).toUpperCase();
  }
  ,e:  function(flags,width,precision,arg)
  { var iPrecision = parseInt(precision,10);
    if(isNaN(iPrecision)) {iPrecision = 6;}
    var rs = (Math.abs(arg)).toExponential(iPrecision);
    if(rs.indexOf('.')<0 && flags.indexOf('#')>=0){ rs = rs.replace(/^(.*)(e.*)$/,'$1.$2');}
    return Sprintf.processFlags(flags,width,rs,arg);
  }
  ,f: function(flags,width,precision,arg)
  { var iPrecision = parseInt(precision,10);
    if(isNaN(iPrecision)) {iPrecision = 6;}
    var rs = (Math.abs(arg)).toFixed(iPrecision);
    if(rs.indexOf('.')<0 && flags.indexOf('#')>=0) {rs = rs + '.';}
    return Sprintf.processFlags(flags,width,rs,arg);
  }
  ,G: function(flags,width,precision,arg)
  { return (Sprintf.converters.g(flags,width,precision,arg)).toUpperCase();
  }
  ,g: function(flags,width,precision,arg)
  { var iPrecision = parseInt(precision,10);
    var absArg = Math.abs(arg);
    var rse = absArg.toExponential();
    var rsf = absArg.toFixed(6);
    if(!isNaN(iPrecision))
    { var rsep = absArg.toExponential(iPrecision);
      rse = rsep.length < rse.length ? rsep : rse;
      var rsfp = absArg.toFixed(iPrecision);
      rsf = rsfp.length < rsf.length ? rsfp : rsf;
    }
    if(rse.indexOf('.')<0 && flags.indexOf('#')>=0) {rse = rse.replace(/^(.*)(e.*)$/,'$1.$2');}
    if(rsf.indexOf('.')<0 && flags.indexOf('#')>=0) {rsf = rsf + '.';}
    var rs = rse.length<rsf.length ? rse : rsf;
    return Sprintf.processFlags(flags,width,rs,arg);
  }
  ,o: function(flags,width,precision,arg)
  { var iPrecision=parseInt(precision,10);
    var rs = Math.round(Math.abs(arg)).toString(8);
    if(rs.length<iPrecision){ rs=Sprintf.pad(rs,' ',iPrecision - rs.length);}
    if(flags.indexOf('#')>=0) {rs='0'+rs;}
    return Sprintf.processFlags(flags,width,rs,arg);
  }
  ,X: function(flags,width,precision,arg)
  { return (Sprintf.converters.x(flags,width,precision,arg)).toUpperCase();
  }
  ,x: function(flags,width,precision,arg)
  { var iPrecision=parseInt(precision,10);
    arg = Math.abs(arg);
    var rs = Math.round(arg).toString(16);
    if(rs.length<iPrecision) {rs=Sprintf.pad(rs,' ',iPrecision - rs.length);}
    if(flags.indexOf('#')>=0) {rs='0x'+rs;}
    return Sprintf.processFlags(flags,width,rs,arg);
  }
  ,s: function(flags,width,precision,arg)
  { var iPrecision=parseInt(precision,10);
    var rs = arg;
    if(rs.length > iPrecision){ rs = rs.substring(0,iPrecision);}
    return Sprintf.processFlags(flags,width,rs,0);
  }
  ,z: function(flags,width,precision,arg)
  {
    var iPrecision=parseInt(precision,10);
    var rs = serialize(arg);
    if(rs.length > iPrecision) {rs = rs.substring(0,iPrecision);}
    return Sprintf.processFlags(flags,width,rs,0);
  }
}
};

function sprintf(fstring) {
  if (fstring) {
    if (!isString(fstring)) {
      throw new Error("sprintf(fmtstr): fmtstr not a string");
    }
    try {
      var farr = fstring.split('%');
      var retstr = farr[0];
      var fpRE = /^([-+ #]*)(\d*)\.?(\d*)([cdieEfFgGosuxXz])(.*)$/;
      var fps;

      for (var i = 1; i < farr.length; i++) {
        fps = fpRE.exec(farr[i]);
        if (!fps) {
          continue;
        }
        if (arguments[i] != null) {
          retstr += Sprintf.converters[fps[4]](fps[1], fps[2], fps[3], arguments[i]);
        }
        retstr += fps[5];
      }
      return retstr;

    } catch (exc) {
      debugger;
      return fstring;
    }
  } else {
    return '';
  }
}
//--------------------------------------------------------------------------


//================== end sprintf
/**
 *
 * @param o  code for function, from which to extract function name
 * @returns name of the function
 */
function extractFuncName(o)
{
  var s = o.toString();  // just incase it isn't already a string
  var re   = /^\s*function\s+([A-Za-z0-9_]+\s*\([^)]*\))/;
  var anon = /^\s*function\s*(\([^)]*\))/;
  if(re.test(s)) {
    return re.exec(s)[1];
  } else if(anon.test(s)) {
    return 'anon' + anon.exec(s)[1];
  }
  return "~func~";
}


// iterate a function over a property which may or may not be an array
function iterateF(p, f)
{
  if(p !== undefined){
    if(p.splice) { //p.constructor === Array) {
      for(var i = 0, len = p.length; i < len; ++i) {
        f(p[i]);
      }
    } else {
      f(p);
    }   // end if
  } // end if there is object
}

// iterate F with a break after first function to return something other than undefined
function iterateFB(p, f)
{
  var r;
  if(p !== undefined){
    if(p.splice) { //if(p.constructor === Array) {
      for(var i = 0, len = p.length; i < len; ++i) {
        r = f(p[i]);
        if(r !== undefined) {break;}
      }
    } else {
      r = f(p);
    }   // end if
  } // end if there is object
  return r;
}


function stacktrace() {

  var stack = [];
  var text = [];

  var t = arguments.callee.caller;
  var i = 0;

  do  {
    if(t) {
      // prevent cycles
      if(iterateFB(stack, function(p) {if(p == t)return true;})) {
        break;
      }
      stack.push(t);
      t = t.caller;
    } else { break;}
    ++i;
  }while(i < 10);

  for(i = 0; i < stack.length; ++i) {
    text.push(extractFuncName(stack[i]));
  }
  return text.join("\n");
}




function assert(expr, more)
{
  if(!expr) {
    var trace = stacktrace(arguments.callee.caller);
    var details = '';
    if(more) {
      var args = [];
      for(var i = 1; i < arguments.length; ++i)
        args.push(arguments[i]);

      details = sprintf.apply(window, args);
    }

    throw new Error('assertion violation: ' + details + '. \n'+ trace);
  }

}

//========== minimal logger functionality, just maps to modern console.log ======

var Logger = new function()
{
  this.ts = true; //??? try this
  this.start = new Date();

  this.loguf = function(str /*, logclass*/)
  {
    if (this.ts)
      str = '' + (new Date() - this.start) + ':' + str;


    console.log.call(console.log, str);
  };


  // log formatted uses foundation sprintf definition for %s %d %0.2f type formatting in the string
  this.log = function(string)
  {
    this.loguf(sprintf.apply(null, arguments));
  };

  this.error = function(string)
  {
    this.loguf(sprintf.apply(null, arguments), 'error');
  };

  this.dump = function(o)
  {
    var str = '';
    var sepstr =  "\n";
    str += 'object dump of type:' + typename(o) + sepstr;

    for (var i in o)
    {
      if (!isFunction(o[i]))
      {
        str += '{type: ' + typename(o[i]) + '} ';
        str += (i + ': ' + o[i] + sepstr);
      }
    }
    this.log(str);
  };

};

// lite function decorator generator that operates only Javascript classes (identified by their constructors)
/*
 example usage:
 AOPAdvice.before(Foo, print, func);
 should be more like:

 var advice =
 {
 before:
 {
 name1: function() {}  // works great where we want to decorate one exact function
 name2: function() {}
 name3: function() {}
 }

 around:
 {

 }
 after:
 {


 }
 };
 Asbestos.advise(classname, advice);  // apply the advice to the name classes prototype, or just do that manually with classname.prototype?
 */

// aspect system
var Asbestos = {

  // force existence of an asbestos property
  // the purpose of recordAdvice is only to know whether advice has already been run once (and what type)
  // it only makes a note of a previously unadvised method
  recordAdvice: function(o, method, note)
  {
    assert(o[method], "Asbestos cannot find method %s", method);
    assert(isFunction(o[method]), "Property %s is not a function", method);

    // is there a backup object?
    if(isObject(o._asbestos_)) {
      if(o._asbestos_[method]) { return o._asbestos_[method]; } // return that, without backing up
      o._asbestos_[method] = note;
      return false;                      // there was no backed up method
    }

    o._asbestos_ = {};                     // create a place holder for backups
    o._asbestos_[method] = note;           // record the note
    return false;                          // there was no backup before (by definition)
  },

  before: function(o, method, bf) {
    var orig = o[method];
    assert(orig, "Asbestos cannot find method %s to add advice", method);

    o[method] = function() {
      bf.apply(this, arguments);          // perform the before
      return orig.apply(this, arguments); // perform the original  (if advised > 1 time what happens?)
    };
  }, // end around

  after: function(o, method, af) {
    var orig = o[method];
    assert(orig, "Asbestos cannot find method %s to add advice", method);
    o[method] = function() {
      var result = orig.apply(this,arguments); // what if it throws an exception, what is good advice semantics
      af.apply(this, arguments); // perform the after advice
      return result; // cannot tamper with result
    };
  }, // end after
  // leaving out around advice for this pass, Keep it simple

  advise: function(o, advice)
  {
    o = o.prototype? o.prototype: o;
    var method;

    if(advice.before) {
      for(method in advice.before)
      {
        this.before(o, method, advice.before[method]);
      }
    }
    if(advice.after) {
      for(method in advice.after)
      {
        this.after(o, method, advice.after[method]);
      }
    }
  }
};





exports.Logger        = Logger;
exports.isFunction   = isFunction;
exports.isObject     =  isObject;
exports.isAlien      =  isAlien;
exports.isArray      =  isArray;
exports.isBoolean    =  isBoolean;
exports.isNull       =  isNull;
exports.isNumber     =  isNumber;
exports.isString     =  isString;
exports.isUndefined  =   isUndefined;
exports.nada         =  nada;
exports.inherits     = inherits;
exports.classname = classname;
exports.sprintf = sprintf;
exports.assert = assert;
exports.iterateF = iterateF;
exports.iterateFB = iterateFB;
exports.Asbestos = Asbestos;



