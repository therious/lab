import {Color} from './ticket/Color';

type ColorCardProps = {color:Color, count:number}

const cardstyle = {
  display: 'inline-block', minHeight:'30px', minWidth:'40px',
  border: '1px solid black', margin: '5px', color: '#ccc', paddingBottom:'0', paddingTop:'10px',
};
// white triangle, black diamond, blue drop, red x, green fourpointstar, yellow circle, wildcard hexagonal

export function ColorCard({color, count}:ColorCardProps)
{
  return <div style={{...cardstyle, backgroundColor: color}}>{count}</div>
}
