export function hasAny<T extends Object>(o:Partial<T>, keys:(keyof T)[]):boolean
{
  for(let k of keys)
    if(k in o) return true;
  return false;
}

export function hasAll<T extends Object>(o:Partial<T>, keys:(keyof T)[]):boolean
{
  for(let k of keys)
    if(!(k in o)) return false;
  return true;
}
