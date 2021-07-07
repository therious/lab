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


function convertTransition({/*from,*/ to:target,when:cond=null,evt=null,timer:after=null}, fromState)
{
  const prop = evt? 'on': after? 'after': cond? 'always': undefined;

  if(!prop)
    throw new Error('illegal transition');

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
  const {name:id, start: initial, io: context} = cfg;
  const states = {};
  const xs = {id, initial, context, states};

  // create an entry for each state
  cfg.states.forEach(s => states[s] = {});

  cfg.transitions.forEach(t => {
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
