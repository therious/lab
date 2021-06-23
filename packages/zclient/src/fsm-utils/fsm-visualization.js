import {splitTransitions} from "./fizbin-utills";

const fmtMillisAsSeconds = {minimumIntegerDigits: 1, maximumFractionDigits: 3, minimumFractionDigits:0};

function convertMillisToLabel(millis)
{
  const nMillis = (0+millis)/1000;

  return nMillis.toLocaleString('en-us', fmtMillisAsSeconds) + ' secs';
}
function transitionToString({from, to, when:cond=null,evt=null,timer:after=null})
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
  console.warn('+uml+', result);
  return result;

}

export function fizbinToPlantUml(config)
{
  const transitions = splitTransitions(config).map(t=>transitionToString(t));
  const {name,start:initialState} = config;


  const context = Object.entries(config.io).map(([k,v])=>`${k}: //${v}//`);

  const contextStr = context?
`
note as Context  #FFFFFF
  **Context:**
  --
  ${context.join('\n')}
end note

`
    :'';


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

  [*]-->${initialState}
  ${transitions.join("\n  ")}
}  
@enduml
`
);

}
