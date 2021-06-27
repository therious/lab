// import moment from 'moment';
import {DateTime} from 'luxon';

let requestCounter=0;

const fmtNow = {minimumIntegerDigits:9, maximumFractionDigits:3, minimumFractionDigits:3};
const fmtCtr = {minimumIntegerDigits: 6, maximumFractionDigits: 0, minimumFractionDigits:0};


const formatOrigin = v=>Math.round(v*1000).toString(36).padStart(11,'0');
const formatNow    = v=>v.toLocaleString('en-US', fmtNow);
const formatCtr    = v=>v.toLocaleString('en-US', fmtCtr);

const timeOrigin = formatOrigin(performance.timeOrigin);

const dateTimeFmt = "yyyy-MM-dd HH:mm:ss.SSS";

let pNowMicros = 0;

const reqIdRegEx = /#(?<origin>[0-9a-z]{11})\+(?<now>[0-9,.]{15})=(?<counter>[0-9,]{7})/;

const ignoreRegex = /(,|\.)/g;

const parseIgnore = s => {
    const ss = s.replace(ignoreRegex, '')
    return parseInt(ss,10);
}


const usPerMs    = 1000;
const msPerSec   = 1000;
const secsPerMin = 60;
const minsPerHr  = 60;
const hrsPerDay  = 24;
const usPerSec   = usPerMs  * msPerSec;
const usPerMin   = usPerSec * secsPerMin;
const usPerHr    = usPerMin * minsPerHr;
const usPerDay   = usPerHr  * hrsPerDay;


function ts(micros) {
    let r = micros;
    const [us, SSS, ss, mm, hh, dd] = [usPerMs,msPerSec,secsPerMin,minsPerHr, hrsPerDay, 1].map((div,i)=>{
        const v = r % div;
        r = (r-v) / div;
        return (''+v).padStart(i<2?3:2,'0');
    });

    return `${dd} days ${hh}:${mm}:${ss}.${SSS}${us}`;

}



function describeReqId(reqId) {

    const {origin, now, counter} = reqIdRegEx.exec(reqId).groups;
    const nOrigin     = parseInt(origin,36)/1000;
    const nNowMicros  = parseIgnore(now);
    const nNowMillis  = nNowMicros * 0.001;
    const nCounter    = parseIgnore(counter);
    const mOrigin     = DateTime.fromMillis(nOrigin);
    const mRequest    = DateTime.fromMillis(nOrigin+nNowMillis);
    const originStr   = mOrigin.toFormat(dateTimeFmt);
    const reqStr      = mRequest.toFormat(dateTimeFmt);

    const since = ts(nNowMicros);
    const delta = ts(nNowMicros-pNowMicros);

    pNowMicros = nNowMicros;


    return {originStr,reqStr,nCounter,since,delta};
}

export function reqIdGenerate()
{
    const id =  `#${timeOrigin}+${formatNow(performance.now())}=${formatCtr(++requestCounter)}`;
    const desc = describeReqId(id);
    console.warn(`id = ${id}`, desc);

    return id;
}