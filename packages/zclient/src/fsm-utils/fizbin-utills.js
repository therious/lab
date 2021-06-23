function fizbinToXStateTrans({from, to:target,when:cond=null,evt=null,timer:after=null}, fromState)
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

function addFizbinBehavior(behavior, xs)
{
  Object.entries(behavior).forEach(([k,v])=>{
    if(k === 'enter') {

    }


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

  return results;
}

export function fizbinToXState(cfg,behavior) {
  const {name:id, start: initial, io: context} = cfg;
  const states = {};
  const xs = {id, initial, context, states};

  // create an entry for each state
  cfg.states.forEach(s => states[s] = {});

  cfg.transitions.forEach(t => {
    const {from} = t;
    if (typeof from === 'string') {
      if (from === '*')
        Object.values(states).forEach(f => fizbinToXStateTrans(t, f)); // all states have this transiton
      else
        fizbinToXStateTrans(t, states[from]);  // one state has this transition
    } else {
      from.forEach(f => fizbinToXStateTrans(t, states[f]));  // [s1,s2] have same transition
    }
  });

  if(behavior) {


  }

  return xs;
}
