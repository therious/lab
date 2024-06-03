import axios from "axios";
import * as jsYaml from "js-yaml";
//@ts-ignore
import fs from "fs";

export interface ConfigSingleton {
  queryParams: Record<string,string>;
  [key:string]: Record<string, any>;
}

function deepFreeze(o:any)
{
  Object.freeze(o);
  Object
    .getOwnPropertyNames(o)
    .forEach(prop=>deepFreeze(o[prop]));
}

async function serverFetch(url:string):Promise<any>
{
  //@ts-ignore
  const cwd = process.cwd();

  //@ts-ignore
  const prefix = import.meta?.env?.MODE !== "development"?  '' : '/public';

  const nurl = `${cwd}${prefix}${url}`;

  //@ts-ignore
  console.log(`prefix: "${prefix}", cwd: "${cwd}" url:${url}, nurl: "${nurl}`, import.meta.env.MODE)


  let result =  fs.readFileSync(nurl);
  if(url.endsWith(".yaml"))
    result = jsYaml.load(result);
  if(typeof result !== 'object') throw new Error(`Loaded Config at ${nurl} should be an object`);

  return result;

}
async function fetchConfig(url:string):Promise<any>
{
  console.info(`fetching configuration at ${url}`);
  let result;
  try {
    if(!globalThis?.window?.document)
      return serverFetch(url);  // we are running in a server, not on browser

    const response = await axios.get(url);
    if(response.status !== 200) throw new Error(`OnlyAcceptStatus200, not ${response.status}`);
    result = response.data;
    if(url.endsWith(".yaml"))
      result = jsYaml.load(result);
   if(typeof result !== 'object') throw new Error(`Loaded Config should be an object`);

  } catch(err) {
    console.error(`Could not load configuration from ${url}`, err);
    throw err;
  }
  return result;
}

export let promisedConfig:ConfigSingleton|null = null;

export class Config
{
  public static queryParams(): Record<string, any>
  {
    // @ts-ignore
    return Object?.fromEntries([...new URLSearchParams(globalThis?.location?.search)]);
  }
  public static async fetch(explictUrl?:string): Promise<ConfigSingleton>
  {
    const qp = this.queryParams();
    const configUrl = explictUrl || `/config/${qp.config}`;
    const configObject:ConfigSingleton = await fetchConfig(configUrl);
    configObject.queryParams = qp;
    // deepFreeze(configObject);
    promisedConfig = configObject;
    return promisedConfig;
  }
  public static singleton():ConfigSingleton
  {
    if(promisedConfig)
      return promisedConfig;
    throw new Error(`singleton referenced before fetch`);
  }

}
