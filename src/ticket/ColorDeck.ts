import {Color} from './Color';
import {Deck} from './Deck';

const colorCount = 10;
const wildCount = 12;

export class ColorDeck extends Deck<Color>
{
  constructor() {
    super([
      ...new Array(colorCount).fill(Color.Red),
      ...new Array(colorCount).fill(Color.Green),
      ...new Array(colorCount).fill(Color.Yellow),
      ...new Array(colorCount).fill(Color.Blue),
      ...new Array(colorCount).fill(Color.White),
      ...new Array(colorCount).fill(Color.Black),
      ...new Array(wildCount).fill(Color.Wild)]);
  }
}

