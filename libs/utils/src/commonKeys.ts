type key =  string|number|symbol;

export const commonKeys = (a:any, b:any) => Object.keys(a).filter({}.hasOwnProperty.bind(b));

// todo very inefficient for now but just need something working
export const identicalKeys = (a:any,b:any) => {
  const aLen = Object.keys(a).length;
  const bLen = Object.keys(b).length;
  return (aLen === bLen) && commonKeys(a,b).length === aLen;
}

function objectsHaveSameKeys(...objects:Record<key, unknown>[]):boolean {
  const allKeys:key[] = objects.reduce((keys, object) => [...keys, ...Object.keys(object)], [] as key[]);
  const union = new Set(allKeys);
  return objects.every(object => union.size === Object.keys(object).length);
}


