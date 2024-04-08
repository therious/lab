// on the last overlapping call is invoked immediately after return
//
// Example calls in sequence
// A B C D                            E         F G H
// |---------A-------|------D------|  |----E----------|--H--|

export function noOverlap(f:any, name:string)
{
  const argStash:any = [];
  return function(...rest:unknown[]) {
    // if nothing pending add to beginning of array
    // if somethjing is pending it is added to the second slot in array only
    // each pending invocation replaces other prior pending invocations
    argStash[argStash.length === 0? 0:1] = [...rest];

    // array size can only be 1 or 2
    // 1: execute, await and see if  more have been added
    // 2. return now, execution of pending item (or successor) will be piucked up in the hwile loop
    if(argStash.length > 1)
      return;
    (async ()=>{
      do {
        await f(...argStash[0]);  // await result of the function
        argStash.shift();         // shift off the array
      } while (argStash.length);  // continue if another one is pending
    })();
  };
}
