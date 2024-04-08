import {slaStyle, fix2} from './slaTimerUtils';
export function slaSetInterval(cb:(...args:any[])=>void, millis:number, slaMillis:number, pctOff:number):ReturnType<typeof setInterval>
{
  const allowed = Math.max(millis, slaMillis); // if configured higher than fixed sla, change the sla

  const exceedSlaMillis = allowed * (1 + pctOff);
  let previousInvoke:number;
  let duration:number;
  let slaCounter = -1;

  const callName = 'slaSetInterval';

  const logIfIssue = (counter:number, issueType:string, diff:number)=> {
    if (diff <= exceedSlaMillis)
      return;
    const factor = diff / allowed;
    let addendum;

    const prefix = `+++${issueType}[#${counter}] ${callName} exceeded by factor `;

    if (issueType === 'wake') {
      const wakePart = diff - duration; // subtract out duration of the task if it is contributing
      if (wakePart < exceedSlaMillis) // don't seat a millisecond worth of wake delay
        return;
      const wakeFactor = wakePart / allowed;
      const msg = `%c ${prefix} ${fix2(wakeFactor)}x over ${allowed}ms`;

      addendum = ` (duration: ${fix2(duration)}x, woke after additional ${fix2(wakePart)}ms`;
      console.warn(msg + addendum, slaStyle(wakeFactor));
    } else {
      const msg = `%c ${prefix} ${fix2(factor)}x over ${allowed}ms`
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

  return setInterval(f, millis);
}

