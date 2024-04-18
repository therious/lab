
const fmt = (n:number, digits:number) => n.toLocaleString('en-US', { useGrouping: true, minimumIntegerDigits: 1, maximumFractionDigits: digits});

export function logThrottle(delay:number, f:Function) {
  type Cached = { count: number, args: unknown[] };
  const messageCache: Map<unknown, Cached> = new Map();

  const repeatedBoilerplate = `x repeat of the following message in the last ${fmt(delay / 1000,3)}s`;

  const clearMessage = (message: unknown) => () => {
    const cached = messageCache.get(message);
    if (cached !== undefined) {
      const {count, args} = cached;
      if (count) {
        if (typeof message === 'string')
          f(`${fmt(count,0)}${repeatedBoilerplate}\n${message}`, ...args);
        else
          f(`${fmt(count,0)}${repeatedBoilerplate}`, message, ...args);
      }
      messageCache.delete(message);
    }
  };

  return function (message: unknown, ...rest: unknown[]) {
    const cached = messageCache.get(message);
    if (cached !== undefined)
      ++cached.count;
    else
    {
      messageCache.set(message, {count: 0, args: [...rest]});
      setTimeout(clearMessage(message), delay);
      f(message, ...rest);
    }
  }
}

const reportError = logThrottle(10_000, (errmsg:string, error:any, event:any)=>console.error(errmsg, error ?? event));


window.onerror = (event, source, lineno, colno, error)=>
{
  const errmsg = `Uncaught error: ${source}:${lineno}:${colno}`;
  reportError(errmsg, error, event);
}

