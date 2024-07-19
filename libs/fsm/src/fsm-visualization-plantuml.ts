import {normalizeBehavior, splitTransitions} from "./fsm-convert";
import {FsmConfig, FsmNormalizedTransition, ee} from './fsm-types';
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
  const nMillis = (0+millis) * 0.001;

  return nMillis.toLocaleString('en-us', fmtMillisAsSeconds) + ' secs';
}
function transitionToString({from, to, cond, evt, after}:NormalizedTransition)
{
  let cause;

  let arrowStyle = '';

  if(evt) {
    cause = cond? `${evt} [${cond}]`: evt;
  } else if(cond) {
    cause = `[${cond}]`;
  } else if(after) {
    arrowStyle = '[#blue,dotted]'; // todo centralize the style control rather than embed it
    cause = convertMillisToLabel(after);
  } else {
    cause = '????';
  }

  const transition = `${from}-${arrowStyle}->${to}`;
  const result = `${transition} : ${cause}`;
  console.warn('+uml+', result);
  return result;

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
export function fsmConfigToPlantUml(config:FsmConfig, behavior={})
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