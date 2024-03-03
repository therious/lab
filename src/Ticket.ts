export enum Color { Red, Green, Yellow, Blue, White, Black, Wild}

const colorCount = 10;
const wildCount = 12;

export class ColorDeck
{
   arr:Color[] = [
     ...new Array(colorCount).fill(Color.Red),
     ...new Array(colorCount).fill(Color.Green),
     ...new Array(colorCount).fill(Color.Yellow),
     ...new Array(colorCount).fill(Color.Blue),
     ...new Array(colorCount).fill(Color.White),
     ...new Array(colorCount).fill(Color.Black),
     ...new Array(wildCount).fill(Color.Wild)];

   shuffle() {
     const array = this.arr;
     for (let i = array.length - 1; i > 0; i--) {
       const j = Math.floor(Math.random() * (i + 1));
       [array[i], array[j]] = [array[j], array[i]];
     }
   }

   deal(ncards: number): Color[]
   {
      if(this.arr.length < ncards)
        throw new Error(`not enough cards`);
      const result = this.arr.slice(0, ncards);
      this.arr = this.arr.slice(ncards);
      return result;
   }
}

enum City {
  Seattle, SanFrancisco, LosAngeles,
  Calgary, Helena, SaltLakeCity,
  Albuquerque, Denver, Winnipeg,
  Duluth, KansasCity, Dallas,
  Montreal, Chicago, Atlanta, NewOrleans,
  NewYork, Washington, Miami
};

const WestCoast = [ City.SanFrancisco, City.Seattle, City.LosAngeles];
const EastCost = [City.NewYork, City.Washington, City.Miami];

type Ticket = [City, City];

export const Tickets: Ticket[] =
[
  [City.Calgary, City.Chicago], [City.Calgary, City.SanFrancisco], [City.Calgary, City.LosAngeles],
  [City.Chicago, City.Miami],   [City.Chicago, City.Albuquerque],   [City.Chicago, City.NewOrleans],
  [City.Helena, City.KansasCity], [City.Helena, City.Chicago],
  [City.KansasCity, City.Miami],
  [City.Dallas, City.Miami],
  [City.Denver, City.LosAngeles], [City.Denver, City.SanFrancisco], [City.Denver, City.NewOrleans],
  [City.NewYork, City.Dallas], [City.NewYork, City.Atlanta],   [City.NewYork, City.Miami], [City.NewYork, City.NewOrleans],
  [City.Duluth, City.SaltLakeCity], [City.Duluth, City.Albuquerque], [City.Duluth, City.Washington],
  [City.Montreal, City.Atlanta], [City.Montreal, City.KansasCity],
  [City.KansasCity, City.Washington], [City.NewOrleans, City.Washington],
  [City.Seattle, City.Albuquerque], [City.Seattle, City.LosAngeles], [City.Seattle, City.Denver], [City.Seattle, City.Winnipeg],
  [City.LosAngeles, City.Dallas], [City.SaltLakeCity, City.Dallas],
  [City.Winnipeg, City.NewYork], [City.Winnipeg, City.Montreal]
];

