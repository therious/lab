// an "External" promise has resolve and reject functions attached, so anyone can resolve it at any time
// by invoking resolve() or reject() off of the promise itself, rather than run a function at the time of its creation

export type ExternalPromise<T> = Promise<T> & {resolve:(v:T)=>T, reject:(error:Error) => Error};

export function CreateExternalPromise<T>():ExternalPromise<T> {
  let resolve;
  let reject;
  const promise = new Promise<T>((res,rej)=>{resolve=res; reject=rej});
  return Object.assign(promise, {resolve,reject}) as unknown as ExternalPromise<T>;
}
