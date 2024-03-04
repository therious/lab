import {Color, ColorStyle} from './ticket/Color';

type ColorCardProps = {color:Color}

const cardstyle = {
  display: 'inline-block', minHeight:'40px', minWidth:'40px',
  border: '1px solid black', margin: '5px'
};
// white triangle, black diamond, blue drop, red x, green fourpointstar, yellow circle, wildcard hexagonal

export function ColorCard({color}:ColorCardProps)
{
  return <div style={{...cardstyle, backgroundColor: ColorStyle[color]}}/>
}
