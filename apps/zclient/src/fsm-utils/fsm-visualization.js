import {normalizeBehavior, splitTransitions} from "./convert";

/*
  Aside from simple terminal vs non-terminal node visualization distinction
  need a way to provide visualization hints for node to represent the following distinctions

  terminal - no recovery
  terminal - with automated action that restarts system
  ideal state - one state is the target state, it should draw attention

  stepping stone state        - all states leading in target state (if no target state then all states in line from start to terminal states)
  ideal/target state          - one state we are trying to maintain
  recoverable state           - not stepping, terminal, or ideal
  terminal state, no recovery - a state that cannot fix itself
  terminal rebooting state    - a terminal state in terms of machine, but one which restarts same machiune



aside from automatically marking some states as terminal,
need a way to hint to visualizations that some starts indicate an issue, other states are an ideal target state
 */

const fmtMillisAsSeconds = {minimumIntegerDigits: 1, maximumFractionDigits: 3, minimumFractionDigits:0};

function convertMillisToLabel(millis)
{
  const nMillis = (0+millis)/1000;

  return nMillis.toLocaleString('en-us', fmtMillisAsSeconds) + ' secs';
}
function transitionToString({from, to, cond=null,evt=null,after=null})
{
  let cause;

  let arrowStyle = '';

  if(evt) {
    cause = cond? `${evt} [${cond}]`: evt;
  } else if(cond) {
    cause = `[${cond}]`
  } else if(after) {
    arrowStyle = '[#blue,dotted]'; // todo centralize the style control rather than embed it
    cause = `${convertMillisToLabel(after)}`;
  } else {
    cause = '????';
  }

  const transition = `${from}-${arrowStyle}->${to}`;
  const result = `${transition} : ${cause}`;
  // console.warn('+uml+', result);
  return result;

}

function actionStringize(normalized)
{
  const results = [];

  Object.entries(normalized).forEach(([k,v])=>{
    v.entry.forEach(fn=>results.push(`state ${k} : entry / ${fn}`));
    v.exit.forEach(fn=>results.push(`state ${k} : exit / ${fn}`));
  });
  return results;
}
export function fizbinToPlantUml(config, behavior={})
{
  const {transitions,terminal} = splitTransitions(config);

  const terminalStrings = terminal.map(t=>`state ${t} #magenta`);
  const normalized = normalizeBehavior(behavior, config);

  const attributeStrings = actionStringize(normalized);

  const targetString = config.target? `state ${config.target} #palegreen`:'';

  const transitionStrings = transitions.map(t=>transitionToString(t));
  const {name,start:initialState} = config;
  const crIndent = '\n  ';

  const {context={}} = config;
  const contextItems = Object.entries(context).map(([k,v])=>`${k}: ${v?'//'+v+'//':''}`);

  const contextStr = !contextItems? '':
`
note as Context  #FFFFFF
  **Context:**
--
  ${contextItems.join('\n  ')}
end note

`;

  return (
`
@startuml
skinparam State {
  AttributeFontSize 9
  BackgroundColor #CFF
  EndColor Red
  ArrowColor Blue
  BorderColor Black
}


state ${name} {
${contextStr}
  ${   attributeStrings.join(crIndent)}
  ${terminalStrings.join(crIndent)}
  ${targetString}
  
  [*]-->${initialState}
  ${transitionStrings.join(crIndent)}
}  
@enduml
`
);

}
