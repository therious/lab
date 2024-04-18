export function hasAny<T extends object>(o:Partial<T>, keys:(keyof T)[]):boolean
{
  for(const k of keys)
    if(k in o) return true;
  return false;
}

export function hasAll<T extends object>(o:Partial<T>, keys:(keyof T)[]):boolean
{
  for(const k of keys)
    if(!(k in o)) return false;
  return true;
}
