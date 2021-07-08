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

//   daylight: (ctx,evt)=>ctx.ambientLight > 0.5,
//   dimlight: (ctx,evt)=>ctx.ambientLight < 0.5,

function wrapGuard(guardValue)
{
  // test guardValue to see if it looks like a function definition, this is a cheap test
  // todo put in a better test for arrow functions
  if(stringLooksLikeArrowFunction(guardValue)) {
    const guardfunc = eval(guardValue);
    return function() {
      console.info(`!!! guardfunc`, guardfunc)
      return guardfunc.apply(this, Array.from(arguments));
    }
  }
  throw new Error(`!!!guard definition '${guardValue}' doesn't look like the required arrow function`);
}

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

function convertTransition(transSource, fromState)
{

  const {/*from,*/ to:target,cond:icond=null,evt=null,after=null} = transSource;

  const prop = evt? 'on': after? 'after': icond? 'always': undefined;

  if(!prop) {
    console.error('illegal transition', transSource);
    throw new Error('illegal transition');
  }

  const cond = icond? wrapGuard(icond): undefined;

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


export function createXStateConfiguration(cfg, behavior) {
  const {name:id, start: initial, context, transitions } = cfg;
  const states = {};
  const xs = {id, initial, context, states};

  // create an entry for each state
  cfg.states.forEach(s => states[s] = {
    entry: [(c,e,m)=>console.info(`!!! entering ${m.state.value}`)]

  });

  transitions.forEach(t => {
    const {from} = t;
    if (typeof from === 'string') {
      if (from === '*')
        Object.values(states).forEach(f => convertTransition(t, f)); // all states have this transition
      else
        convertTransition(t, states[from]);  // one state has this transition
    } else {
      from.forEach(f => convertTransition(t, states[f]));  // [s1,s2] have same transition
    }
  });

  if(behavior) {


  }

  return xs;
}


// takes an object with enterXXX, exitXXX, enter, and exit type entries (be they functions or strings and puts them into normalized form
// behaviors[state][enter] = [], behabiors[state][exit] = [];
export function normalizeBehavior(behavior, cfg)
{
  // init results as an object with one key per state, value of each being an object with enter/exit arrays of functions
  const normalized = oReduce(cfg.states, st=>[st, {enter:[], exit:[]}]);

  Object.entries(behavior).forEach(([k,v])=>{
    if(k === 'enter' || k === 'exit') {
      Object.values(normalized).forEach(destValue=>destValue[k].push(v));
    } else  {
      // test for enter or exit to specific states
      const results = k.match(/^(?<phase>enter|exit)(?<state>.+)$/);
      const {phase=null,state=null} = results.groups;
      if(phase && state)
        normalized[state][phase].push(v);
      else
        throw new Error(`unexpected key ${k}`);
    }
  });
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
