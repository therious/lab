import {Color} from './ticket/Color';
import {useState, useEffect} from 'react';
import {Player} from './ticket/Player';
import {CSSProperties} from 'react';

const cardHand = {
  display: 'inline-block',
  position: 'relative',
  zIndex: 0,
  width: 'fit-content', height: 'fit-content',
  border: '1px solid black',
} satisfies CSSProperties;


const card = {
  borderStyle: 'solid',
  width: '36px', height: '50px',
  borderWidth: '1px', borderRadius: '10px',
  display: 'inline-block',
  marginLeft: '-20px',
  transition: 'bottom 1s, left 1s, width 1s, height 1s, transform 1s'
} satisfies CSSProperties;


const cardDark  = {...card, borderColor: 'white', };
const cardLight = {...card, borderColor: 'black', };

type CardHandProps = { player: Player};

export const CardHand = ({player}:CardHandProps) =>
  <div style={cardHand} >
    {Object.entries(player.colorCardsInHand).filter(([_, v]) => v).map(([k, v], index, array) => {
      const offIndex = array.slice(0, index).reduce((accum: number, [_, vv]) => accum + vv, 0);
      return <ColorCard color={k as Color} count={v} offIndex={offIndex}/>
    })}
  </div>;

// white triangle, black diamond, blue drop, red x, green fourpointstar, yellow circle, wildcard hexagonal
type ColorCardProps = { color: Color, count: number, offIndex: number }


function ColorCard({color, count, offIndex}: ColorCardProps) {
  const [cards, setCards] = useState<void[]>((new Array(count)).fill(0));

  useEffect(() => {
    setCards((new Array(count)).fill(0));
  }, [count]);

  const style = (color === 'white' || color === 'yellow') ? cardLight : cardDark;
  return (<>
    {cards.map((_, index) => <div style={{
      ...style,
      zIndex: (index + offIndex) + 1,
      backgroundColor: color,
      marginLeft: `${(index + offIndex)? style.marginLeft: '0px'}`,
    }}/>)}
  </>);
}
