/**
 *
 * @param a  array to reduce
 * @param f  function that returns a map entry, returned key value pair will be added to a map
 * @param o  optional starter object, defaults to empty object
 * @returns object with the key value pairs created by the function passed into oreduce
 */
type reducef = (v:any, accum:Record<any,any>)=>[any,any];
type orecord = Record<any,any>
export function oReduce(a:unknown[],f:reducef, o:orecord = {})
{
  return a.reduce((accum:orecord,v)=>{
    const [k,nv]=f(v, accum);
    accum[k]= nv;
    return accum;
  }, o);
}

