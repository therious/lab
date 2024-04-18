import {NonEmptyString} from './types';
// some very limited safety within the limits of typescript temlate literal types
type SnowflakePrefix = '@'|'!'|'•'|'†'|'°'|'÷'|'#'|'±'|'§'|'~';


type sfOrigin   = `${string}`
type sfNow      = `${number},${number},${number}`;
type sfCounter  = `${number}`;

export type SnowflakeId = `${SnowflakePrefix}${sfOrigin}+${sfNow}=${sfCounter}`;
const Snowflake:Record<string, SnowflakePrefix> = {
  At:         '@',
  Bang:       '!',
  Bullet:     '•',
  Dagger:     '†',
  Degree:     '°',
  Divide:     '÷',
  Hash:       '#',
  PlusMinus:  '±',
  Section:    '§',
  Tilde:      '~',
}  as const;

const counters = <Record<SnowflakePrefix, number>>
  {
    [Snowflake.At]:        0,
    [Snowflake.Bang]:      0,
    [Snowflake.Bullet]:    0,
    [Snowflake.Dagger]:    0,
    [Snowflake.Degree]:    0,
    [Snowflake.Divide]:    0,
    [Snowflake.Hash]:      0,
    [Snowflake.PlusMinus]: 0,
    [Snowflake.Section]:   0,
    [Snowflake.Tilde]:     0,
  };

const reserved = new Map<SnowflakePrefix, string>();

class SnowflakeError extends Error {}

/**
 * @param prefix SnowflakePrefix a single character string from a limited set used by
 * @param purpose NonEmptyString describing use made of the reserved prefix
 */
export function reservePrefix(prefix:SnowflakePrefix, purpose:NonEmptyString)
{
  if(reserved.has(prefix))
    throw new SnowflakeError(`prefix already reserved for '${reserved.get(prefix)}'`);
  reserved.set(prefix, purpose);
}


const fmtNow = {minimumIntegerDigits:9, maximumFractionDigits:3, minimumFractionDigits:3};
const fmtCtr = {minimumIntegerDigits: 6, maximumFractionDigits: 0, minimumFractionDigits:0};

const twodigit:string = '2-digit';

const plainJsDateFormat = { year:'numeric', month:twodigit,    day:twodigit };
const plainJsTimeFormat = { hour:twodigit, minute:twodigit, second:twodigit, fractionalSecondDigits: 3}
const plainJsDateTimeFormatter = (ms:number) => {
    // @ts-ignore
    const dtPart = (new Date(ms)).toLocaleString('fr-CA', plainJsDateFormat);
    // @ts-ignore
    const tmPart = (new Date(ms)).toLocaleString('en-GB', plainJsTimeFormat);
    return `${dtPart} ${tmPart}`;
}

const formatOrigin = (v:number)=>Math.round(v*1000).toString(36).padStart(11,'0') as sfOrigin;
const formatNow    = (v:number)=>v.toLocaleString('en-US', fmtNow) as sfNow;
const formatCtr    = (v:number)=>v.toLocaleString('en-US', fmtCtr) as sfCounter;

const timeOrigin = formatOrigin(performance.timeOrigin);
export const minisession = timeOrigin;

const reqIdRegEx:RegExp = /(?<prefix>[@!•†°÷#±§~])(?<origin>[0-9a-z]{11})\+(?<now>[0-9,.]{15})=(?<counter>[0-9,]{7})/;

// a selection 10 prefixes to distinguish different sets of ids with their unique counters
// an application will choose e.g. Snowflake.Hash or Snowflake.Bullet for their needs

const ignoreRegex = /([,.])/g;

const parseIgnore = (s:string) => {
    const ss = s.replace(ignoreRegex, '')
    return parseInt(ss,10);
}


const usPerMs    = 1000;
const msPerSec   = 1000;
const secsPerMin = 60;
const minsPerHr  = 60;
const hrsPerDay  = 24;


export function isSnowflakeId(id: unknown): id is SnowflakeId
{
    return typeof id === 'string'   &&
      36 === id.length  &&
      reqIdRegEx.exec(id) !== null;
}


export const snowflakeId = (prefix:SnowflakePrefix):SnowflakeId=>`${prefix}${timeOrigin}+${formatNow(performance.now())}=${formatCtr(++counters[prefix])}`;


reservePrefix(Snowflake.Hash, 'external request');
reservePrefix(Snowflake.At,   'internal request');

export const reqIdGenerate         = ()=>snowflakeId(Snowflake.Hash);
export const reqIdGenerateInternal = ()=>snowflakeId(Snowflake.At);


export type SnowflakeDesc  = {
   origin: number,
  request: number,
    since: number,
  counter: number,
   prefix: SnowflakePrefix,
     type: string,
};

export type SnowflakeDescFormatted  = {
   origin: string,
  request: string,
    since: string,
  counter: number,
   prefix: SnowflakePrefix,
     type: string,
};

export function reqIdDescribeN(reqId:string):SnowflakeDesc {
  const match = reqIdRegEx.exec(reqId);
  const {prefix, origin:sOrigin, now:sNow, counter:sCounter} = match?.groups || {};
  const origin      = parseInt(sOrigin, 36) * 0.001; // convert to millis
  const since       = parseIgnore(sNow);             // leave as micros
  const counter     = parseIgnore(sCounter);
  return {prefix: prefix as SnowflakePrefix, origin, request:origin+since*0.001, counter, since,  type: reserved.get(prefix as SnowflakePrefix)! };
}

function ts(micros:number): string {
  let r = micros;
  const [us, SSS, ss, mm, hh, dd] = [usPerMs, msPerSec, secsPerMin, minsPerHr, hrsPerDay, 1]
    .map((div, i)=>
    {
      const v = r % div;
      r = (r-v) / div;
      return (''+v).padStart(i < 2? 3: 2, '0');
    });

  return `${dd} days ${hh}:${mm}:${ss}.${SSS}${us}`;
}

export function reqIdDescribe(reqId:string): SnowflakeDescFormatted {
  const {origin, counter, since:nSince, prefix, type} = reqIdDescribeN(reqId);

  const since = ts(nSince);
  return {  origin: plainJsDateTimeFormatter(origin),
           request: plainJsDateTimeFormatter(origin + nSince * 0.001),
             since,
    counter, prefix, type
         }
}


