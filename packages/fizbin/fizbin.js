// Finite State Machine for JavaScript
// copyright 2008 Haim Zamir
// 2015 - just barely getting started modernizing, nodizing, ehancing, etc.

const th = require('th-utils');

const assert = th.assert;
const Logger = th.Logger;
const Asbestos = th.Asbestos;


// these utility functions need to be moved/repacked as appropriate
function renderExpressionAsFunctionStr(str) {
  const re = /\b([A-Za-z]+[A-Za-z0-9_]*)\b/g;

  const nstr = str.replace(re, "inputs.$1");

  return "function(inputs) { return (" + nstr + ")   /*comment*/;}";

}

function expressionTerms(knownTerms, expr) {
  const re = /\b([A-Za-z]+[A-Za-z0-9_]*)\b/g;

  const foundTerms = expr.match(re); // return array of all terms found
  assert(th.isArray(foundTerms) && foundTerms.length >= 1, "transition expression %s must include at least one term", expr);

  for (let i = 0; i < foundTerms.length; ++i) {
    const term = foundTerms[i];
    assert(knownTerms[term], "term [%s] in expression [%s] must be defined in the io section", term, expr);

    Logger.log('found term [%s] in expression [%s]', term, expr);
  }
  return foundTerms;
}


function expressionToFunction(expr) {
  const fstr = renderExpressionAsFunctionStr(expr);
  let f = null;
  eval("f = " + fstr);
  return f;
}


// this is our error space. all errors values are replaced with name of property
// by propertize.  The javascript editor flags use of unknown properties
const fsmerr =
  {
    InvalidEnter: 0
    , InvalidExit: 0
    , InvalidStateName: 0
    , InvalidSobSrc: 0
    , BadStateName: 0
    , SobIsNotObject: 0
    , NotAnArray: 0
    , ArrayTooSmall: 0
    , ArrayTooLarge: 0
    , ArrayIndexTooSmall: 0
    , ArrayIndexTooLarge: 0
    , Unimplemented: 0
    , BadFsmParams: 0
    , BadConfiguration: 0
    , BadOptions: 0
    , BadFsmName: 0
    , BadAcyclic: 0
    , NotAFunction: 0
    , NotAString: 0
    , NotAnObject: 0
    , NotANumber: 0
    , NotDefined: 0
    , NotABoolean: 0
    , WrongType: 0
  };

function cloneProperties(o) {
  const r = {};
  for (let p in o) {
    if (o.hasOwnProperty(p))
      r[p] = o[p];
  }
  return r;
}

// create string values for all properties
function propertize(o) {
  for (let p in o) {
    if (o.hasOwnProperty(p)) {
      o[p] = p;
    }
  }
}

propertize(fsmerr);

// convert all properties of object into an array of names
function arrayize(o) {
  const arr = [];
  for (let p in o) {
    if (o.hasOwnProperty(p))
      arr.push(p);
  }
  return arr;
}


const fsm = {}; // create a new place holder for all the fsm datatypes

class FsmFactory {


  constructor(collaboratorclass) {
    const self = this; // for sake of closure functions

    const config = collaboratorclass.config;

    assert(th.isObject(config), fsmerr.BadFsmParams + fsmerr.BadConfiguration + fsmerr.NotAnObject);

    const srcStates = config.states;
    const initialState = config.start;
    const srcTransitions = config.transitions;
    const options = config.options;
    let error;

    this.taskClass = collaboratorclass;

    this.graph = {
      task: collaboratorclass
      , taskName: th.classname(collaboratorclass.prototype)
      , size: srcStates.length             // how many states
      , initialState: initialState        // name of the initial state
      , srcStates: srcStates              // src objects/strings for building sobs
      , srcTransitions: srcTransitions    // source data for all the transitions
      , srcInputs: config.io              // as specified
      , eventSources: config.eventSources || null
      , options: options           // statemachine wide configuration info
      , knownEvents: {}                  // 'input alphabet' (known event tokens) to which we respond global version
                                         // there is also a local version for each state (state pattern)
    };

    const graph = this.graph;


    // sanity check our construction arguments  (ultimately will enable or disable assertion checking)
    error = this.invalidArray(srcStates, 1, 10, this.invalidSobSrc);
    assert(!error, '%s=invalidArrayOfStrings(states)', error);

    error = this.invalidArrayIndex(srcStates, initialState);
    assert(!error, '%s=invalidArrayIndex(states)', error);


    // private variables aside from our parameters which are also used via closure
    graph.stateMap = self.compileStates(srcStates, options);   // map version of states
    assert(this.graph.stateMap[initialState], 'invalid initial state name: %s', initialState);
    // for(let k in graph.stateMap) { graph.stateNames.push(graph.stateMap[k].s);}

    this.compileIo();

    error = self.compileTransitions(); // assemble spec into executable form
    assert(!error, 'compileTransitions: %s', error);

    this.markTerminalNodes();

    //XXX beware: options are not copied, and could be modified at runtime (not intentional)
    error = fsm.invalidOptions(options);
    assert(!error, 'fsm options: %s', error);

    if (!options.alien)
      options.alien = this.nada; // do nothing function

  }

// mark some of the nodes as terminal (no way out of state)
  markTerminalNodes() {
    const states = this.graph.srcStates;
    const sm = this.graph.stateMap;
    const trans = this.graph.srcTransitions;

    const wayOutMap = {};

    let i, j;
    let st;
    for (i = 0; i < trans.length; ++i) {
      const transition = trans[i];
      if (transition.from === '*') {
        for (j = 0; j < states.length; ++j) {
          st = states[j];
          if (transition.to !== st) {
            wayOutMap[st] = 1; // there is a way out
          }
        }
      } else if (th.isArray(transition.from)) {
        const fstates = transition.from;
        for (j = 0; j < fstates.length; ++j) {
          st = fstates[j];
          wayOutMap[st] = 1; // there is a way out
        }
      } else {
        wayOutMap[transition.from] = 1; //there is a way out
      }
    }

    // generate strings for the nodes themselves
    for (i = 0; i < states.length; ++i) {
      st = states[i];
      if (wayOutMap[st] === undefined) {
        sm[st].terminal = true; // mark it as a terminal state
      }
    }
  }


  create(id, taskInstance) {
    const t = th.inherits(this);  // create an object that inherits all of our methods (we only need the graph)

    // all private data going into a single enclosure variable called 'enclosure'
    t.perinst = {
      id: id
      , state: null                 // what is our current state
      , nextState: null            // [ephemeral] while transitioning to a state
      , inputs: {}
    };
    t.taskInstance = taskInstance;
    t.perinst.state = this.graph.stateMap[this.graph.initialState];    // XXX current state

    return t;
  }


  invalidArrayIndex(arr, index) {
    if (index < 0) return fsmerr.ArrayIndexTooSmall;
    if (index >= arr.length) return fsmerr.ArrayIndexTooLarge;
    return 0;
  }

  /**
   * validation function for array of strings
   * @param arr array to be validated
   * @param min array must be no smaller than min
   * @param max array mnust be no bigger than max
   * @param invalidEntry invalidation function
   * @returns non-zero o error
   */
  invalidArray(arr, min, max, invalidEntry) {
    if (!th.isArray(arr))
      return fsmerr.NotAnArray;

    const len = arr.length;
    if (len < min)
      return fsmerr.ArrayTooSmall;
    if (len > max)
      return fsmerr.ArrayTooLarge;

    if (invalidEntry) { // is there an invalidation function
      for (let i = 0; i < len; ++i) {
        const err = invalidEntry.call(this, arr[i]);
        if (err) {
          return `invalidArray index ${i} error # ${err}`;
        }
      }
    }
    return 0;
  }


  /**
   * @param sobsrc  for creating an sob (state object) to be inspected
   * @return string non-zero if not valid src obj for constructing sob, otherwise zero
   */
  invalidSobSrc(sobsrc) {
    const isstring = th.isString(sobsrc);
    if (isstring) {
      return 0;
    }  // strings are fine they are name only
    return fsmerr.BadStateName + fsmerr.NotAString;
  }

  // enter and exit function execution
// modify call(this to call(this.collaborator)
  efExit(psob, sob) {
    const x = psob.x;
    if (x) {
      x.call(this.taskInstance, psob.s, sob.s, this.perinst.id);
    }
  }

  efEnter(sob, psob, cause) {
    const e = sob.e;
    if (e) {
      e.call(this.taskInstance, sob.s, psob.s, this.perinst.id, cause);
    }
  }


  //-----  privileged readonly methods (have access to state) ----------------------
  state() {
    return this.perinst.state;
  }

  size() {
    return this.graph.size;
  }

  states() {
    return this.graph.srcStates;
  }

  events() {
    return arrayize(this.graph.knownEvents);
  }

  // what events are relevant now
  contextualEvents() {
    return arrayize(this.perinst.state.eventMap);
  }

  identify() {
    return this.perinst.id;
  }


  doTransition(cause) {
    const ss = this.perinst.state;
    const ns = this.perinst.nextState;

    const multitimer = this.perinst.multitimer;
    if (multitimer) {
      //log('clearing multitimer {ss:%z, ns:%z}', ss,ns);
      multitimer.clear();   // cancel any open timer
    }

    this.efExit(ss, ns);     // leave prior state

    this.perinst.state = ns;   // perform state change here
    this.perinst.nextState = null; // we are no longer header anywhere

    if (multitimer) {
      //log('resetting multitimer {ss:%z, ns:%z}', ss,ns);
      multitimer.reset(ns.timerConfig);  // reset clears and rearms if new state has a timerConfig
    } else if (ns.timerConfig) {
      //log('instantiating multitimer {ss:%z, ns:%z}', ss,ns);
      this.perinst.multitimer = new MultiTimer(ns.timerConfig, this);
    }
    this.efEnter(ns, ss, cause);    // announce our entry into the new state

  }

  //----- input interface into state machine, send external events here
  transduce(fsmevt, defOut, ignoreOut) {
    const ss = this.perinst.state;

    //... does current state accept, ignore, or reject the purported event?

    const potential = ss.eventMap[fsmevt];     // recognized token?

    if (potential) {                          // has potential to change states or react
      this.perinst.nextState = doPotential(potential, this.perinst.inputs);    // evaluate to find nextState, and/or reaction
      // are we transitioning out
      if (this.perinst.nextState) {
        this.doTransition(fsmevt);
        // reactions (input actions will produce actual output
        return defOut;     // since we are officially a transducer return something
      }

    } else if (ss.alien || ss.extra) {

      // if we get this far, rejecting event, is it at least a token known to fsm
      // transducer results for rejected input are specific to the fsm  created
      if (this.graph.knownEvents[fsmevt]) {
        return ss.extra.call(this.taskInstance, this.perinst.id, fsmevt, ss.s);
      } else {
        return ss.alien.call(this.taskInstance, this.perinst.id, fsmevt, ss.s);
      }
    }

    return ignoreOut; // undefined results are the universal transducer ignored output
  }

  compileIo() {
    const sio = this.graph.srcInputs;
    for (let prop in sio) {
      if (sio.hasOwnProperty(prop))
        sio[prop](this, prop);  // creates a setter for all the io variables specified (by invoking fsm.logical, fsm.numeric, etc)
    }
  }

  /**
   *  produce a complete state object as copy of what was passed in
   * @param src  (minimally a string (state name), or an object with
   *              s:<statename> [, e: (entry function] [,x:  exit function])
   * @param sobmap a map of known states so far to detect violations like
   *               unique state names
   */
  compileState(src, sobmap/*, options*/) {
    const sob = {};

    sob.s = src;                                  // assume string (assertions checked elsewhere)
    sob.$label$ = `State:${sob.s}`;

    const proto = this.taskClass.prototype;

    let f;
    f = proto[`enter${sob.s}`] || proto.enter; // state-specific or generic entry
    if (f) {
      sob.e = f;
    }

    f = proto[`exit${sob.s}`] || proto.exit;  // state-specific or generic exit
    if (f) {
      sob.x = f;
    }

    f = proto[`extra${sob.s}`] || proto.extra; // state-specific or generic extra (unrecognized but legal tokens)
    if (f) {
      sob.extra = f;
    }

    f = proto[`alien${sob.s}`] || proto.alien; // state-specific or generic extra (unrecognized but legal tokens)
    if (f) {
      sob.alien = f;
    }


    sob.soloMap = {};                             // this property has a lifetime only during compilation, used assertion checking
    sob.eventMap = {};                            //  possible transitions from state triggered by events
    sob.conditionMap = {};                        // possible transitionsfrom state triggered by conditions (no event participation)

    // we cannot have two states with the same name
    if (sobmap[sob.s]) {
      throw new Error(`redundant state: ${sob.s}`);
    }

    return sob;
  }

  compileStates(srcStates, options) {
    const len = srcStates.length;
    const sobmap = {};

    if (!this.taskClass.prototype)
      throw new Error('taskClass is not a class: ' + funcname2(this.taskClass));  // todo find funcname2 this is broken code

    for (let i = 0; i < len; ++i) {
      const sob = this.compileState(srcStates[i], sobmap, options);
      sobmap[sob.s] = sob;
    }
    return sobmap;

  }


// find the class to be decorated
  parseAdviceBasedEvent(str) {
    assert(this.graph.eventSources, "fsm does not have any defined event sources to use with %s", str);

    const parts = str.split('#');   //str.match(/(.*)_(.*)/);
    assert(parts.length === 2, "event '%s' does not have the proper id_event format", str);
    const id = parts[0];

    const classobj = this.graph.eventSources[id];
    assert(classobj, "there is no event source matching id %s", id);

    parts.push(classobj);  //parts[2] has the actual class in it

    return parts;
  }
}


// there is an event clause, and possibly a when clause

function doPotential(arrayf, o) {
  let r;
  // arrayf should always have at least one function
  for (let i = 0, len = arrayf.length; i < len; ++i) {
    r = arrayf[i](o);
    if (r) {
      break;
    }
  }
  return r;
}


fsm.invalidOptions = function invalidOptions(options) {
  const base = fsmerr.BadOptions;

  if (!th.isObject(options)) return base + fsmerr.NotAnObject;

  if (options.acyclic !== undefined && !th.isBoolean(options.acyclic)) return base + fsmerr.BadAcyclic + fsmerr.NotABoolean;
  if (options.acyclic) return base + fsmerr.BadAcyclic + fsmerr.Unimplemented;
};


//---- these are the io input compilers

// ternary logic input, right now not constrained, so implementation is same as numeric
fsm.logical = function (inst, id) {
  assert(inst[id] === undefined, "input variable '%s' conflicts with existing fsm method of the same name", id);

  // bind a function directly to the name of the input
  inst[id] = function (v) {

    if (v === undefined)
      return this.perinst.inputs[id];   // its a getter if there is no variable passed in

    // note that nothing can happen by setting a variable to a value it already has
    if (v !== this.perinst.inputs[id]) {
      // Logger.log('%s: setting input %s to %z', this.perinst.id, id, v);
      this.perinst.inputs[id] = v;

      const cm = this.perinst.state.conditionMap;  // lookup any state transitions that depend on this constiable given current state
      const potential = cm[id];                     // recognized token?

      if (potential) {                                // has potential to change states or react
        this.perinst.nextState = doPotential(potential, this.perinst.inputs);    // evaluate to find nextState, and/or reaction

        // are we transitioning out
        if (this.perinst.nextState) {
          this.doTransition(id + "=" + v);
        }
      }

    } // end if logical input is changing the current value
  };
};


fsm.numeric = function (inst, id) {
  assert(inst[id] === undefined, "input variable '%s' conflicts with existing fsm method of the same name", id);

  // bind a function directly to the name of the input
  inst[id] = function (v) {
    if (v === undefined)
      return this.perinst.inputs[id];   // its a getter if there is no variable passed in

    // note that nothing can happen by setting a variable to a value it already has
    if (v !== this.perinst.inputs[id]) {
      //Logger.log('%s: setting input %s to %z', this.perinst.id, id, v);
      this.perinst.inputs[id] = v;
      const cm = this.perinst.state.conditionMap;  // lookup any state transitions that depend on this variable given current state
      const potential = cm[id];                     // recognized token?
      if (potential) {                                // has potential to change states or react
        this.perinst.nextState = doPotential(potential, this.perinst.inputs);    // evaluate to find nextState, and/or reaction
        // are we transitioning out
        if (this.perinst.nextState) {
          this.doTransition(id + "=" + v);
        }
      }

    } // end if logical input is changing the current value
  };
};

//fsm.timer   = function (inst,e,id)      { assert(0, 'compileTimerInput:   ' +id);};


// have to distinguish between the data that is shared between all MultiTimers (name, times) for a given state
// and the timer instance (id, index, target)
function MultiTimerConfig(name) {
  this.name = name;
  this.times = [];   // array of timer fire delays
  this.latest = 0;  // just tracks the latest time submitted so far to the timer, while timer is being built
}

MultiTimerConfig.prototype = {
  constructor: MultiTimerConfig
  , add: function (expires) {
    assert(th.isNumber(expires), "timer value '%s' must be a number", expires);
    assert(expires > 0, "timer value'%s' must be greater than zero", expires);
    assert(expires > this.latest, "timer value (%s) must exceed previous timer for same state (%s)", expires, this.latest);
    this.times.push(expires - this.latest);
    this.latest = expires;
    return this.eventName(this.times.length);
  }

  , eventName: function (arrayLength) {
    return this.name + "[" + (arrayLength - 1) + "]";
  }

};

function MultiTimer(config, target) {
  this.fsmTarget = target;
  this.index = 0;
  const self = this;

  // define in constructure since enclosure needed
  this.fire = function () {
    ++self.index;
    const tcfg = self.config;
    if (self.index < tcfg.times.length) {
      self.arm();
    }

    //log('timer fire configuration = %z', tcfg);
    self.fsmTarget.transduce(tcfg.eventName(self.index));  // send event to state machine

  };
  this.reset(config);  // clears and rearms timer
}

MultiTimer.prototype =
  {
    constructor: MultiTimer

    , clear: function () {
      if (this.id) {
        clearTimeout(this.id);
      }
      this.id = null;
      this.index = 0;
    }
    , reset: function (config) {
      this.config = config;
      //log('timer.reset(%z)', config);

      // a minority of states have timer generated events, so config may be undefined
      // then there is nothing to rearm, and timer awaits reset to a defined config
      if (config) {
        this.arm();
      }
    }
    , arm: function () {
      this.id = setTimeout(this.fire, this.config.times[this.index]);
    }
  };

FsmFactory.prototype.compileTimerBasedTransition = function (tsrc, sob) {
  const expires = tsrc.timer;

  if (sob.timerConfig === undefined) {
    sob.timerConfig = new MultiTimerConfig(sob.s);
  }
  tsrc.evt = sob.timerConfig.add(expires);   // from here it is a straightforward event
  this.compileEventBasedTransition(tsrc);
};

/*
    1.create a way for an identical event to be generated by different instances?
 */

FsmFactory.prototype.compileAdviceBasedTransition = function (tsrc) {
  const advice = tsrc.before ? 'before' : 'after';
  const token = tsrc[advice];

  const parts = this.parseAdviceBasedEvent(token);
  const method = parts[1];
  const classObj = parts[2];

  const priorAdvice = Asbestos.recordAdvice(classObj.prototype, method, advice);

  if (!priorAdvice) {

    const f = function () {
      assert(this.fsmTarget, "no fsmTarget for event: '%s'", token);
      assert(this.fsmTarget.transduce, "invalid fsmTarget for event '%s'", token);
      this.fsmTarget.transduce(token);
    };
    // use foundation class Asbestos to add AOP type advice to generate event
    Asbestos[advice](classObj.prototype, method, f, true);
  } else {
    assert(priorAdvice === advice, "only one type of advice allowed for event '%s'", method);
  }

  // from here it is a straightforward event
  tsrc.evt = token;
  this.compileEventBasedTransition(tsrc);
};
//==============================
// take a variable number of arguments and prefer the first initialized one
function preferString(o, a, b) {
  return o[a] ? o[a] : (o[b] ? o[b] : '');
}

FsmFactory.prototype._visualizeStates = function (nodeNameMap, edges) {
  const states = this.graph.srcStates;
  const sm = this.graph.stateMap;
  const nodes = ['startHere[shape=box]'];
  // use pair of maps to isolate terminal nodes
  let i;


  // generate strings for the nodes themselves
  for (i = 0; i < states.length; ++i) {
    const st = states[i];
    if (st === this.graph.initialState) {
      edges.push(th.sprintf('startHere->n%d [style=dashed label="initialState" fontSize=10]', i));
    }
    let extra = '';
    if (st === this.perinst.state.s) {
      extra += 'color=palegreen ';
    }
    if (sm[st].terminal) {
      extra += ' shape=box ';   // doublecircle seems not to work
    }

    nodes.push(th.sprintf('n%d [%slabel = "%s"]', i, extra, st));
    nodeNameMap[st] = `n${i}`;
  }
  return nodes;
};

FsmFactory.prototype._visualizeTransitions = function (nodeNameMap, edges) {
  const trans = this.graph.srcTransitions;
  for (let i = 0; i < trans.length; ++i) {
    const tsrc = trans[i];
    let j, temp, states;
    if (tsrc.from === '*') {
      temp = cloneProperties(tsrc);
      states = this.graph.srcStates;
      for (j = 0; j < states.length; ++j) {
        if (tsrc.to !== states[j]) {
          temp.from = states[j];
          this._visualizeTransition(temp, nodeNameMap, edges, true);
        }
      } // end for
    }
    if (th.isArray(tsrc.from)) {
      temp = cloneProperties(tsrc);
      states = tsrc.from;
      for (j = 0; j < states.length; ++j) {
        temp.from = states[j];
        this._visualizeTransition(temp, nodeNameMap, edges);
      } // end for
    } else {
      // normal case
      this._visualizeTransition(tsrc, nodeNameMap, edges);
    }
  } // end for
}; // end _visualizeTransitions()

FsmFactory.prototype._visualizeTransition = function (transition, nodeNameMap, edges, ephemeral) {

  let event = preferString(transition, 'timer', 'evt');
  if (th.isNumber(transition.timer)) {
    event = th.sprintf("%0.2f secs", event / 1000);
  }
  let cond = preferString(transition, 'when', 'when');
  if (cond) {
    const extraspace = event ? ' ' : '';    // do I add an extra space?
    cond = extraspace + '[' + cond + ']';  // rendered with brackets by Harel fsm convention
  }

  const from = nodeNameMap[transition.from];
  const to = nodeNameMap[transition.to];
  if (ephemeral) {
    edges.push(th.sprintf('%s->%s [label="%s%s" color=grey]', from, to, event, cond));
  } else {
    edges.push(th.sprintf('%s->%s [label="%s%s"]', from, to, event, cond));
  }
};


FsmFactory.prototype.visualize = function () {
  const nodeNameMap = {};
  const edges = [];
  const nodes = this._visualizeStates(nodeNameMap, edges);

  this._visualizeTransitions(nodeNameMap, edges);

  const prolog = "digraph {\n  rankdir=LR\n  compound=true\n  node[fontsize=14 width=.8  shape=circle style=\
filled color=cornsilk]\n  edge[color=blue fontsize=10]\n  ";
  const epilog = "\n} /* end digraph */";

  return prolog + nodes.join("\n  ") + "\n  " + edges.join("\n  ") + epilog;
};

FsmFactory.prototype.compileConditionBasedTransition = function (tsrc) {
  const expr = tsrc.when;
  assert(th.isString(expr) || th.isArray(expr), "condition must be a string or array of strings");

  // support arrays of expressions, even though they are equivalent to a set of ORs
  if (th.isArray(expr)) {
    for (let j = 0; j < expr.length; ++j) {
      const clone = cloneProperties(tsrc);
      clone.when = expr[j];
      this.compileConditionBasedTransition(clone);
    }
    return;
  }


  const terms = expressionTerms(this.graph.srcInputs, tsrc.when);  // produce an array of terms used in expression
  const sobMap = this.graph.stateMap;
  const srcsob = sobMap[tsrc.from];
  const dstsob = sobMap[tsrc.to];
  const cm = srcsob.conditionMap;

  const f = expressionToFunction(tsrc.when);

  const nextStateFinder = function (inputs) {
    if (f && f(inputs)) {
      return dstsob;
    }
    return null;
  };

  for (let i = 0; i < terms.length; ++i) {
    const term = terms[i];
    // guarantee a place to hold condition evaluation function for each term in expression
    if (cm[term] === undefined) {
      cm[term] = [];
    }
    cm[term].push(nextStateFinder);
  }

};

FsmFactory.prototype.compileEventBasedTransition = function (tsrc) {
  const token = tsrc.evt;

  // recurse with copy of tsrc if event is an array rather than a string
  // would also work for arrays of arrays, etc.

  assert((th.isString(token) || th.isArray(token)), "events must be strings or array of strings");

  if (th.isArray(token)) {
    for (let i = 0; i < token.length; ++i) {
      const clone = cloneProperties(tsrc);
      clone.evt = token[i];
      this.compileEventBasedTransition(clone);
    }
    return;
  }


  const sobMap = this.graph.stateMap;
  const knownEvents = this.graph.knownEvents;

  const srcsob = sobMap[tsrc.from];
  const dstsob = sobMap[tsrc.to];
  const em = srcsob.eventMap;
  const solo = srcsob.soloMap;

  if (em[token] === undefined) {
    em[token] = [];   // an empty array
  }

  if (tsrc.when) { // event causes transition only if when clause is true

    // if there is an entry in soloMap then it already has compiled an unconditional transition from this event
    // and cannot possibly reach the conditional transitions (they would have to be stated as opposite conditions)
    assert(solo[token] === undefined,
      "cannot add conditional transition from state '%s' (event '%s') (condition '%s') given an unconditional transition triggered by same event",
      srcsob.s, token, tsrc.when);

    expressionTerms(this.graph.srcInputs, tsrc.when);  // produce an array of terms used in expression

    const f = expressionToFunction(tsrc.when);
    em[token].$label$ = "transition from evt: '" + token + "'";
    em[token].push(function (inputs) {
      if (f && f(inputs)) {
        return dstsob;
      }
      return null;
    });// generate function, add to array

  } else {

    // can't have same token unconditionally responsible for two different transitions from same state
    assert(solo[token] === undefined,
      "can't have two unconditional transitions from state '%s' (event '%s') (the 2nd transition being to state: '%s')",
      srcsob.s, token, dstsob.s);
    assert(em[token].length === 0,
      "can't specify an unconditional transition from state '%s' to state '%s' (event '%s'), having already specified an conditional transition triggered by same event",
      srcsob.s, dstsob.s, token);
    solo[token] = true;                  // prevent any more transitions from state via same event token

    em[token].push(function () {
      return dstsob;
    });// generate function for unconditional transition
  }

  knownEvents[token] = token;  // put it into the global map (no harm if redundant)

};


// transitions look like this
//{from: <state>, to: <state>, evt: <token>,  when: <conditions>}
// reactions (input actions are not dealt with yet, till we have debugged this stuff


FsmFactory.prototype.compileTransitions = function () {

  const self = this;
  const graph = self.graph;
  const sobMap = graph.stateMap;

  // given a single transition spec,
  const compile = function (tsrc) {


    //---- the source and destination state objects must exist
    // XXX still need to support special '*' any state transitions
    const srcsob = sobMap[tsrc.from];
    const dstsob = sobMap[tsrc.to];

    Logger.log("compiling transition for state machine '%s' from %s to %s [%z]", graph.taskName, srcsob.s, dstsob.s, tsrc);
    const missingerrpfx = 'fsm: bad transition spec--missing ';
    assert(srcsob, "%s unknown 'from' state: '%s'", missingerrpfx, tsrc.from);
    assert(dstsob, "%s unknown 'to' state: '%s'", missingerrpfx, tsrc.to);

    // this issue of reuse of event token is due to fact that so far events are the only to determine
    // the transition (until transition conditions are supported), so it would be ambiguous which if any
    // transition would be caused

    tsrc.$label$ = 'Transition';

    if (tsrc.evt) {
      self.compileEventBasedTransition(tsrc);
      assert((tsrc.before === undefined) && (tsrc.after === undefined), "event (%s) and advice (%s/%s) cannot both specified for same transition", tsrc.evt,
        tsrc.before, tsrc.after);
      assert(tsrc.timer === undefined, "cannot specify both an event (%s) and a timer(%s)", tsrc.evt, tsrc.timer);

    } else if (tsrc.timer) {
      assert((tsrc.before === undefined) && (tsrc.after === undefined), "timer and advice cannot be specified for same transition");
      self.compileTimerBasedTransition(tsrc, srcsob);
    } else if (tsrc.before || tsrc.after) {
      assert(tsrc.before === undefined || tsrc.after === undefined, "cannot specify both a before (%s) and after (%s) advice", tsrc.before, tsrc.after);
      // essentially an event that also generates AOP advice to trigger event
      self.compileAdviceBasedTransition(tsrc);
    } else {
      self.compileConditionBasedTransition(tsrc);
    }

  };


  // iterate through all the transitions and compile them
  // for any transition, from: property may be a single state string, '*' (meaning all states besides the to: state)
  // or it may be an array of states to transition from

  th.iterateF(this.graph.srcTransitions,  // '*' to mean "all other states than destination"
    function (tsrc) {

      let temp, states, i;
      if (tsrc.from === '*') {
        temp = cloneProperties(tsrc);
        states = graph.srcStates;
        for (i = 0; i < states.length; ++i) {
          if (tsrc.to !== states[i]) {
            temp.from = states[i];
            compile(temp);
          }
        }
      } else if (th.isArray(tsrc.from)) {
        temp = cloneProperties(tsrc);
        states = tsrc.from;
        for (i = 0; i < states.length; ++i) {
          temp.from = states[i];
          compile(temp);
        }

      } else {
        compile(tsrc);
      }
    }
  );


  // now cleanup all the soloMaps
  for (let state in sobMap) {
    if (sobMap.hasOwnProperty(state))
      delete sobMap[state].soloMap; // no longer need the soloMap, it was just built to detect compilation errors
  }

};

exports.FsmFactory = FsmFactory;
exports.fsm = fsm;