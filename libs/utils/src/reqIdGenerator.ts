let requestCounter=0;

const fmtNow = {minimumIntegerDigits:9, maximumFractionDigits:3, minimumFractionDigits:3};
const fmtCtr = {minimumIntegerDigits: 6, maximumFractionDigits: 0, minimumFractionDigits:0};

const twodigit:string = '2-digit';

const plainJsDateFormat = { year:'numeric', month:twodigit, day:twodigit};
const plainJsTimeFormat = { hour:twodigit, minute:twodigit, second:twodigit, fractionalSecondDigits: 3}
const plainJsDateTimeFormatter = (ms:number) => {
    // @ts-ignore
    const dtPart = (new Date(ms)).toLocaleString('fr-CA', plainJsDateFormat);
    // @ts-ignore
    const tmPart = (new Date(ms)).toLocaleString('en-GB', plainJsTimeFormat);
    return `${dtPart} ${tmPart}`;
}

const formatOrigin = (v:number)=>Math.round(v*1000).toString(36).padStart(11,'0');
const formatNow    = (v:number)=>v.toLocaleString('en-US', fmtNow);
const formatCtr    = (v:number)=>v.toLocaleString('en-US', fmtCtr);

const timeOrigin = formatOrigin(performance.timeOrigin);
export const minisession = timeOrigin;

let pNowMicros = 0;

const reqIdRegEx:RegExp = /(?<prefix>[#@])(?<origin>[0-9a-z]{11})\+(?<now>[0-9,.]{15})=(?<counter>[0-9,]{7})/;

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
//const usPerSec   = usPerMs  * msPerSec;
//const usPerMin   = usPerSec * secsPerMin;
//const usPerHr    = usPerMin * minsPerHr;
//const usPerDay   = usPerHr  * hrsPerDay;


function ts(micros:number) {
    let r = micros;
    const [us, SSS, ss, mm, hh, dd] = [usPerMs,msPerSec,secsPerMin,minsPerHr, hrsPerDay, 1].map((div,i)=>{
        const v = r % div;
        r = (r-v) / div;
        return (''+v).padStart(i<2?3:2,'0');
    });

    return `${dd} days ${hh}:${mm}:${ss}.${SSS}${us}`;

}


export function reqIdDescribe(reqId:string) {
    const match = reqIdRegEx.exec(reqId);
    const {origin,now,counter,prefix} = match?.groups || {};
    const nOrigin = parseInt(origin,36) *0.001;
    const nNowMicros = parseIgnore(now);
    const nNowMillis = nNowMicros * 0.001;
    const nCounter = parseIgnore(counter);
    const originStr = plainJsDateTimeFormatter(nOrigin);
    const reqStr =plainJsDateTimeFormatter(nOrigin+nNowMillis);
    const since = ts(nNowMicros);
    const delta = ts(nNowMicros-pNowMicros);
    pNowMicros = nNowMicros;
    return {origin:originStr, request:reqStr, counter:nCounter,since,delta, external:prefix==='#'};


}


export function reqIdGenerate():string
{
    return `#${timeOrigin}+${formatNow(performance.now())}=${formatCtr(++requestCounter)}`;
}

// use internal identifiers to track async operations not sent as external requests
// these differ only in the prefix @ vs #
export function reqIdGenerateInternal():string
{
    return `@${timeOrigin}+${formatNow(performance.now())}=${formatCtr(++requestCounter)}`;
}
