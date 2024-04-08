import {slaStyle, fix2} from './slaTimerUtils';




export function slaSetTimeout(cb:(...args:any[])=>void, millis:number, slaMillis:number, pctOff:number):ReturnType<typeof setTimeout>
{

  const exceedSlaWakeMillis = millis * (1 + pctOff);
  const exceedSlaExecMillis = slaMillis * (1 + pctOff);
  let previousInvoke:number;
  let duration:number;
  let slaCounter = -1;

  const callName = 'slaSetTimeout';

  const logIfIssue = (counter:number, issueType:string, diff:number)=> {
    const millisToUse = (issueType === 'wake' ? millis : slaMillis);
    const exceeded = (issueType === 'wake' ? exceedSlaWakeMillis : exceedSlaExecMillis);
    if (diff <= exceeded)
      return;
    const factor = diff / millisToUse;
    let addendum;

    const prefix = `+++${issueType}[#${counter}] ${callName} exceeded by factor `;

    if (issueType === 'wake') {
      const wakePart = diff - duration; // subtract out duration of the task if it is contributing
      if (wakePart < exceedSlaWakeMillis) // don't seat a millisecond worth of wake delay
        return;
      const wakeFactor = wakePart / millisToUse;
      const msg = `%c ${prefix} ${fix2(wakeFactor)}x over ${millisToUse}ms`
      addendum = ` (duration: ${fix2(diff / slaMillis)}x over ${slaMillis}ms`;
      console.warn(msg + addendum, slaStyle(wakeFactor));
    } else {
      const msg = `%c ${prefix} ${fix2(diff / slaMillis)}x over ${slaMillis}ms`
      addendum = ` (duration: ${fix2(duration)}ms`;
      console.warn(msg + addendum, slaStyle(factor));
    }
  };

  const f = function(...args:any[]) {
    ++slaCounter;
    const invoked = performance.now();
    if(previousInvoke !== undefined)
      logIfIssue(slaCounter, 'wake', invoked - previousInvoke);
    previousInvoke = invoked;
    cb(...args);
    duration = performance.now() - invoked;
    logIfIssue(slaCounter, 'exec', duration);
  };

  return setTimeout(f, millis);
}
