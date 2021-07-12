import {assign} from 'xstate';
/**
 *
 * @param a  array to reduce
 * @param f  function that returns a map entry, returned key value pair will be added to a map
 * @param o  optional starter object, defaults to empty object
 * @returns object with the key value pairs created by the function passed into oreduce
 */
function oReduce(a,f,o={})
{
  return a.reduce((accum,v)=>{
    const [k,nv]=f(v);
    accum[k]= nv;
    return accum;
  }, o);
}

const arrowFuncRegex = /^.+=>.+/

const stringLooksLikeArrowFunction = s => {
  const result = arrowFuncRegex.test(s);
  console.info(`${result} = stringLooksLikeArrowFunction(${s})`);
  return result;
}

function wrapUpdatesOrGuards(s, logStr)
{
  if(stringLooksLikeArrowFunction(s)) {
    const f = eval(s);
    return logStr?
      function() {
        const args = Array.from(arguments);
        console.info(logStr, f, ...args);
        return f.apply(this, args);
      }
      :
      function() {
        return f.apply(this, Array.from(arguments));
      }
  }
  throw new Error(`${logStr} '${s}' doesn't look like the required arrow function`);

}

// guard examples:
//   daylight: (ctx,evt)=>ctx.ambientLight > 0.5,
//   dimlight: (ctx,evt)=>ctx.ambientLight < 0.5,
const wrapUpdate = ({logUpdates},s) => wrapUpdatesOrGuards(s, logUpdates);
const wrapGuard  = ({logGuards },s) => wrapUpdatesOrGuards(s, logGuards );

/*

const x = {
  name:    'sec2',
  start:   Night                  // initial state
  ,states: [Day,Night,On]     // our set of states

  //---- io section defines signals (events are still union of those mentioned in transitions) ----
  ,context: { ambientLight: 0.1 }

  // all the possible ways to get from one state to another
  // fsm compiler guarantees that all states mentioned are in the states array
  // and that all terms mentioned in condition expression (when) are declared as variables in the io section
  ,transitions:
    [
       {from: Day,        to: Night,  cond: 'dimlight'  } // transition on variable changes
      ,{from: [Night,On], to: Day,    cond: 'daylight'  }
      ,{from: [Night,On], to: On,      evt: 'motion'    } // transition on receiving event tokens
      ,{from: On,         to: Night, after: 5000        } // fizbin generates timer based events
    ]

  ,options:{}
};

  conversion to xstate configuration format should produce something like this:

 const securityLightConfig = {
  id: 'seclight',
  // the initial context (extended state) of the statechart
  context: {
    ambientLight: 0.1,
  },
  initial: Night,
  states: {
    Night: {
      on: { motion: On },
      always: { target: Day, cond: 'daylight' }
    },
    Day: {
      always: { target: Day, cond: 'dimlight' }
    },
    On: {
      on:     { motion: On },
      after:  {   5000: { target: Night}      },
      always: { target: Day, cond: 'daylight' }
    }

  }
}

 */

function convertTransition(transSource, fromState,{logGuards}={})
{

  const {/*from,*/ to:target,cond:icond=null,evt=null,after=null} = transSource;

  const prop = evt? 'on': after? 'after': icond? 'always': undefined;

  if(!prop) {
    console.error('illegal transition', transSource);
    throw new Error('illegal transition');
  }

  const cond = icond? wrapGuard({logGuards}, icond): undefined;

  // fromState has appriopriate transition added to it from transSource
  switch(prop) {
    case 'on':
    case 'after':
      fromState[prop] = fromState[prop] ||{};
      fromState[prop][prop === 'on'? evt: after] = cond? {target, cond} : target;
      break;
    case 'always':
    default:
      fromState.always = {target, cond};
      break;
  }
}


export function createXStateConfiguration(cfg, behavior,options) {
  const {name:id, start: initial, context, updates, transitions } = cfg;
  const states = {};

  let on = {};
  const {logUpdates=''} = options || {};

  if(updates) {
    on = oReduce(Object.entries(updates), ([k,v])=>[k, {actions: assign(wrapUpdate({logUpdates},v))}])
  }
  const xs = {id, initial, context, states, on};

  /*
      https://xstate.js.org/docs/guides/transitions.html#internal-transitions

      To make xstate accept events regardless of current state, they must belong to xs.on (rather than xs.states[state].on)
      each property under xs.on is describes an event for an 'internal' transition, we provide them without target
      so state doesn't change, just the update happens, and if an eventless guard is satisfied it will then produce
      an 'external' transition

      IOW
      xs = {
        states:{},
        on: {
        brighter: {
          actions: assign((context,event)=> { return {...context, val1:blah } }
        } // end event name
        } // end on
      } // end config
   */

  // create an entry for each state
  cfg.states.forEach(s => states[s] = {
    entry: [(c,e,m)=>console.info(`!!! entering ${m.state.value}`)]

  });

  transitions.forEach(t => {
    const {from} = t;
    if (typeof from === 'string') {
      if (from === '*')
        Object.values(states).forEach(f => convertTransition(t, f,options)); // all states have this transition
      else
        convertTransition(t, states[from],options);  // one state has this transition
    } else {
      from.forEach(f => convertTransition(t, states[f], options));  // [s1,s2] have same transition
    }
  });

  if(behavior) {
    normalizeAndApplyBehavior(behavior, cfg, xs);
    console.info(`!!! normalized behavior for ${cfg.name}`, xs);
  }

  return xs;
}


// takes an object with enterXXX, exitXXX, entry, and exit type entries (be they functions or strings and puts them into normalized form
// behaviors[state][(c:any,e:any,m:any)] = [], behaviors[state][exit] = [];
export function normalizeBehavior(behavior, cfg)
{
  // init results as an object with one key per state, value of each being an object with entry/exit arrays of functions
  const normalized = oReduce(cfg.states, st=>[st, {entry:[], exit:[]}]);

  // todo better way to interate methods, what if methods are on the specific instance?
  // or better to reverse query for the desired methods

  const enterExit =  ['entry','exit'];

  // if there are plain entry and exit methods, then bind them to all states as the first action
  enterExit.forEach(k=>{
    const fv = behavior[k];
    if(fv) {
      const wf = fv.bind(behavior);
      Object.values(normalized).forEach(destValue => destValue[k].push(wf));
    }
  })

  // iterate through the states, if behavior contains an entry<State> or exit<State> method, then attach it
  cfg.states.forEach(st=>{
    enterExit.forEach(ee=>{
      const fv = behavior[`${ee}${st}`];
      if(fv)
        normalized[st][ee].push(fv.bind(behavior));
    })
  })

  return normalized;
}

export function normalizeAndApplyBehavior(behavior, cfg, xs)
{
  const normalized = normalizeBehavior(behavior, cfg);
  const {states} = xs;
  Object.entries(normalized).forEach(([k,v])=>{
    const st = states[k];
    st.entry = v.entry;
    st.exit = v.exit;
  });
}


export function splitTransitions(cfg)
{
  const results = [];

  cfg.transitions.forEach(t => {
    const {from} = t;
    if (typeof from === 'string') {
      if (from === '*')
        return cfg.states.forEach(s => results.push({...t, from: s}));
      else
        results.push(t);
    } else {
      from.forEach(f => results.push({...t, from: f}));  // [s1,s2] have same transition
    }
  });

  // now mark which states are terminal
  const nonTerminalStates = {};
  results.forEach(r=>{nonTerminalStates[r.from]=1;});

  const terminal = cfg.states.filter(st=>nonTerminalStates[st]===undefined);

  return {transitions:results, terminal};
}
