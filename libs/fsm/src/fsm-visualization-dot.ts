import {normalizeBehavior, splitTransitions} from "./fsm-convert";
import {FsmConfig, FsmNormalizedTransition, ee, FsmVisualizationOptions} from './fsm-types';
import {FsmControl} from './fsm-control';


type NormalizedTransition = {
  from:   string;
  to:     string;
  evt?:   string;
  cond?:  string;
  after?: number;
}


const fmtMillisAsSeconds = {minimumIntegerDigits: 1, maximumFractionDigits: 3, minimumFractionDigits:0};

function convertMillisToLabel(millis:number):string
{
  const nMillis = millis * 0.001;

  return nMillis.toLocaleString('en-us', fmtMillisAsSeconds) + ' secs';
}
function transitionToString({from, to, cond, evt, after}:NormalizedTransition)
{
  let cause;

  let arrowStyle = '';

  if(evt) {
    cause = cond? `${evt} [${cond}]`: evt;
  } else if(cond) {
    cause = `[${cond.slice('(c)=>'.length)}]`;
  } else if(after) {
    arrowStyle = 'style="dotted" color=blue fontcolor=blue'; // todo centralize the style control rather than embed it
    cause = convertMillisToLabel(after);
  } else {
    cause = '????';
  }

  return `"${from}"->"${to}" [label="${cause}" ${arrowStyle}]`;


}


function actionStringize(normalized:any):string[]
{
  const results:string[] = [];

  Object.entries(normalized).forEach(([k,v])=>{
  const e = v as ee;
    e.entry.forEach(fn=>results.push(`state ${k} : enter / ${fn}`));
    e.exit.forEach(fn=>results.push(`state ${k} : exit / ${fn}`));
  });
  return results;
}


// mark some of the nodes as terminal (no way out of state)
function listTerminalStates({states, transitions}:FsmConfig): Set<string> {
  const stMap = new Set<string>(states);

  transitions.forEach(transition=>{
    const {from, to} = transition;
    // there is a way out state from, if from is a string, and to field is not the same state name
    if(typeof from === 'string' && to !== from) stMap.delete(from);
    else if(Array.isArray(from)) from.forEach(st=>{ if(to !== st) stMap.delete(st) });
  });
  return stMap;
}


function statesToDot(fsmConfig:FsmConfig, options: FsmVisualizationOptions = {}):string[]
{
   // list of all nodes, but terminal nodes look different, and starting node must appear active
   const terminalStates = listTerminalStates(fsmConfig);
   const highlightCurrent = options.highlightCurrentState !== false;
   const currentStateColor = options.colors?.currentState || 'palegreen';
   const nonCurrentStateColor = options.colors?.nonCurrentState || 'cornsilk';

   type NodeIntermediate = {
    name: string, id: string, label: string,
     terminal?: boolean,
     active?: boolean,
   };

   const stateNodes:NodeIntermediate[] = fsmConfig.states.map(st=>{

     const name  = st;  // node name and label do not necessarily agree
     const label = st;
     const id = `n-${st}`;
     const terminal = terminalStates.has(st);
     const active = fsmConfig.start === st;
     return {name, label, id, terminal, active };

   });


   const stateNodesAsDot = stateNodes.map((ni:NodeIntermediate)=>
   {
     const label =                   `label="${ni.label}"`;
     const shape =                   `shape="${ni.terminal?'doublecircle':'circle'}"`;
     const color = highlightCurrent && ni.active 
       ? `fillcolor=${currentStateColor}` 
       : highlightCurrent 
         ? `fillcolor=${nonCurrentStateColor}`
         : '';
     return `"${ni.name}" [${label} ${shape} ${color}]`;

   });

   // todo must find the starting node name and put in an edge

   return [
   `node [shape=circle style=filled color=black fillcolor=${nonCurrentStateColor} fixedsize=true width=1 height=1]`,
   ...stateNodesAsDot ]
}

export function fsmConfigToDot(config:FsmConfig, behavior={}, options: FsmVisualizationOptions = {})
{
  const {transitions,terminal} = splitTransitions(config);


  const transitionStrings = transitions.map(t=>transitionToString(t));

  const stateNodes = statesToDot(config, options);

  const newline = '\n  ';
  return (
`
digraph {
  ${       stateNodes.join(newline)}
  ${transitionStrings.join(newline)}
}
`
);

}
