// insert this delay into any promise chain to transitively delay resolution of a promise
// same data is available on other side of the then statement if promise resolves successfully
// example axios.get(url).then(delay(1000)).then(responsef).catch(catchf);
export const delay = (millis:number)=>(v:unknown)=>new Promise(resolve => setTimeout(()=>resolve(v), millis));

// await sleep(millis)
export const sleep = (millis:number)=>new Promise(resolve => setTimeout(resolve, millis));
