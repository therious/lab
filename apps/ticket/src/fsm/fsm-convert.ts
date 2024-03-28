import {assign} from 'xstate';
import {oReduce} from '../utils/oreduce';
import {FsmTransition, ee, FsmConfig, FsmNormalizedTransition} from './fsm-types';

const arrowFuncRegex = /^.+=>.+/;
const stringLooksLikeArrowFunction = (s:string) => arrowFuncRegex.test(s);

type localDefOptions = {logGuards?:string; logUpdates?:string};

function wrapUpdatesOrGuards(s:string, logStr:string|undefined)
{
  if(stringLooksLikeArrowFunction(s)) {
    const f = eval(s);
    return logStr?
      function(...args:unknown[]) {
        // @ts-ignore
        const result = f.apply(this, args);
        console.info(`${logStr} ${result}=`, f, ...args);
        return result;
      }
      :
      function(...args:unknown[]) {
        // @ts-ignore
        return f.apply(this, args);
      }
  }
  throw new Error(`${logStr} '${s}' doesn't look like required arrow function`);

}

// guard examples:
// daylight: (ctx, evt)=>ctx.ambientLight > 0.5
const wrapUpdate = ({logUpdates}:localDefOptions, s)=> wrapUpdatesOrGuards(s, logUpdates);
const wrapGuard = ({logGuards}:localDefOptions, s)=> wrapUpdatesOrGuards(s, logGuards);

function convertTransition(transSource:FsmTransition, fromState, {logGuards})
{
  const {/*from,*/ to, cond:icond=null, evt=null, after=null} = transSource;

  // al;low using a non-string (eg emppty array, to identify same target as source)
  const target = (typeof to === 'string')? to: fromState;
  const prop = evt? 'on': after? 'after': icond? 'always': undefined;

  if(!prop) {
    console.error(`illegal transition`, transSource);
    throw new Error('illegal transition');
  }

  const cond = icond? wrapGuard({logGuards}, icond): undefined;

  //fromState has appropriate transition added to it from transSource
  switch(prop)
  {
    case 'on':
    case 'after':
    {
      const prop2:string = prop === 'on'? evt!: after!;
      const value = cond? {target, cond}: target;
      fromState[prop] = fromState[prop] || {} ;  // ??=
      const curValue = fromState[prop][prop2]; // is there already a transition 'like' this one?
      if(curValue) {
        if(Array.isArray(curValue))
          curValue.push(value);
        else
          fromState[prop][prop2] = [curValue, value];
      } else {
        fromState[prop][prop2] = value;
      }
      break;
    }
    case 'always':
    default:
      fromState.always = {target, cond};
      break;
  }

}

export function createXStateConfiguration(cfg, behavior, options) {
  const {name:id, start: initial, context, updates, transitions } = cfg;
  const states = {};
  let on = {};
  const {logUpdates=''} = options || {};

  if(updates) {
    on = oReduce(Object.entries(updates), ([k,v])=>[k, {actions: assign(wrapUpdate({logUpdates},v))}]);
  }
  const xs = {id,initial,context,states,on};
  /*
    to make xstate accept events regardless of current state, they must belong to xs.on (rather than xs.states[state].on)
    each property under xs.on describes an event for an 'internal' transition, we provide them without target
    so state doesn't change, just the update happens, and if an eventless guard is satisfied it will then produce
    an 'external' transition

    IOW:

    xs =
    {
      states:{},
      on: {
        brighter: {
          actions: assign((context,event)=> { return {...context, val1:blah}}
        } // end event name
      } // end on
    } // end config
   */
  // create an entry for each state
  cfg.states.forEach(s=> states[s] = {
    entry: [(c,e,m)=>console.info(`!!! entering ${m.state.value}`)]
  });

  transitions.forEach(t=> {
    const {from} = t;
    if(typeof from === 'string') {
      if(from === '*')
        Object.values(states).forEach(f=>convertTransition(t,f,options)); // all states have this transition
      else
        convertTransition(t, states[from], options); // one state has this transition

    } else {
      from.forEach(f=>convertTransition(t, states[f], options)); // [s1,s2] have same trasnsition
    }
  });

  if(behavior) {
    normalizeAndApplyBehavior(behavior, cfg, xs);
    console.info(`!!!normalized behavior for ${cfg.name}`, xs);
  }
  return xs;
}

//takes an object with enterXXX, exitXXX, entry, and exit type entries (be they functions or strings and puts them into normalized form
// behaviors[state][(c:any, e:any, m:any)] = [], behaviors[state][exit] = [];
// todo restate type of behavior as something that extends a Record<`enter${string}`|`exit${string}`, string|Function>
export function normalizeBehavior(behavior:any, cfg:{states:string[]})
{
  //init results as an object with one key per state, value of each being an object with entry/exit arrays of functions
  const normalized:Record<string, ee> = oReduce(cfg.states, (st:string)=>[st,{entry:[], exit:[]}]);
  const enterExit = ['entry','exit'];
  enterExit.forEach(k=>{
    const fv = behavior[k];
    if(fv) {
      const wf = fv.bind(behavior);
      Object.values(normalized).forEach((destValue:ee)=>destValue[k].push(wf));
    }

  })
  //iterate through the states, if behavior contains and entry<State> or exitrr<State> method, then attach it
  cfg.states.forEach(st=>{
    enterExit.forEach(ee=>{
      const fv = behavior[`${ee}$st}`];
      if(fv)
        normalized[st][ee].push(fv.bind(behavior));
    });
  });
  return normalized;
}
// interface ee { entry:any; exit:any; }

export function normalizeAndApplyBehavior(behavior:any, cfg:{states:string[]}, xs)
{
  const normalized = normalizeBehavior(behavior, cfg);
  const {states} = xs;
  Object.entries(normalized).forEach(([k,v])=>{
    const st = states[k];
    st.entry = (v as ee).entry;
    st.exit = (v as ee).exit;
  })

}
export function splitTransitions(cfg:FsmConfig)
{
  const results:FsmNormalizedTransition[] = [];
  cfg.transitions.forEach(t => {
    const {from}  = t;
    if(typeof from === 'string') {
      if(from === '*')
        return cfg.states.forEach(s=>results.push({...t, from: s})); // what does returning a foreach do?
      else
        results.push(t);

    } else { // assume an array
      from.forEach(f=> results.push({...t, from: f})); // [s1,s2] have same transition
    }
  });

  // now mark which states are terminal
  const nonTerminalStates = {};
  results.forEach(r=>{nonTerminalStates[r.from] = -1;});
  const terminal = cfg.states.filter(st=>nonTerminalStates[st]===undefined);
  return {transitions:results, terminal};


}
