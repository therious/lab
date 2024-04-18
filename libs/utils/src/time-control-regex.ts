import {oReduce} from './oreduce';

const reTimeD    = '\\s*((?<delay>\\d+)(?<delayUnits>d|h|m|s)?)\\s*';
const reTimeB    = '\\s*((?<bonus>\\d+)(?<bonusUnits>d|h|m|s)?)\\s*';
const reTimeT    = '\\s*((?<reserve>\\d+)(?<reserveUnits>d|h|m|s)?)\\s*';

const rePeriods = '(?<periods>\\d+)\\s*x\\s*';        // optional "n x"
const reMoves   = 'r?\\s*(?<moves>\\d+)\\s*\\/\\s*';  // optional "[r]n/"
const reDelay   = `\\(${reTimeD}\\)`;                 // optional "(n)"
const reBonus   = `\\+\\s*${reTimeB}`;                // optional "+n"

// all but one component (time) is optional in each phase
const reStr = `(${rePeriods})?(${reMoves})?(${reDelay})?${reTimeT}(${reBonus})?`;
// const reStr = reTimeT;
console.log(reStr);
const regex = new RegExp(reStr);

type TimerUnit = 'd'|'h'|'m'|'s';

function unitsToMultiplier(s:string, def:string):number
{
  switch(s || def) {
    case 'd': return 24*60*60;
    case 'h': return 60*60;
    case 'm': return 60;
    case 's':
    default : return 1;
  }
}

// given a unit tell which unit is less, until we get to seconds
function lesserUnit(s:string, def:string):TimerUnit
{
  switch(s) {
    case 'd': return 'h'; // if days next less unit is hours
    case 'h': return 'm'; // if hours then, minutes
    default : return 's'; // minutes, seconds, and anything else would be seconds
  }
}


function multiplyIt(sval:number, unit:TimerUnit):number
{
  if(sval) {
    const multiplier = unitsToMultiplier(unit, 'm');
    return multiplier * Number(sval);
  }
  return 0;
}

export function cook(raw)
{
  const cooked = {};

  const rMul = unitsToMultiplier(raw.reserveUnits, 'm'); // if no units for reserve, default to minutes (like Chess)

  cooked.reserve = Number(raw.reserve) * rMul;

  const reserveUnits = raw.reserveUnits || 'm';
  const lesserUnits = lesserUnit(reserveUnits);

  ['reserve', 'delay', 'bonus'].forEach(param=>{

    const rawVal = raw[param];
    if(rawVal) {
      const actUnit = raw[`${param}Units`]; // check if units are specified
      // if reserve time & needs default, use minutes, if it is another time, default to next unit down from reserve
      const unit   = param === 'reserve'?  reserveUnits: actUnit || lesserUnits;
      cooked[param] = rawVal? multiplyIt(rawVal, unit): undefined;
    }
  });

  return cooked;

}

export function strToRaw(str:string):object|undefined
{
  const match  = regex.exec(str);
  if(!match || !match.groups) return undefined;

  const entries = Object
    .entries(match.groups)
    .filter(([k,v])=>v !== undefined);
  return Object.fromEntries(entries);
}


