// color mix could just do this for you
function slaHue(factor:number)
{
  const wheelDegrees = 360;
  const halfWhel = wheelDegrees * 0.666; // goes all the way to blue for REALLY slow
  const hueGreen = wheelDegrees * 0.333;
  const adjFactor = 1/1.20412 // rather than change the log to 16 we like this scaling from green=1 to magenta=16

  const adjustedFactor = (Math.log(factor) / Math.LN10) * adjFactor;
  const degrees = hueGreen + (wheelDegrees - Math.min(halfWhel, adjustedFactor * halfWhel));
  return degrees % wheelDegrees;
}

export function slaStyle(factor:number)
{
  const hue = slaHue(factor);
  return `
    padding: 2px 8px;
    border: 1px solid black;
    color: ${hue > 220 && hue < 300? 'white':'black'};
    background-color: hsl(${hue}, 100%, 50%);
  `;
}

export const fixn = (n:number, prec:number)=>n?.toLocaleString(`en-US`, {useGrouping:true, maximumFractionDigits:prec, minimumFractionDigits:prec});
export const fix2 = (n:number)=>fixn(n,2);

