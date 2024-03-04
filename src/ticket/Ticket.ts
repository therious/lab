import {City} from './City';
import {Deck} from './Deck';

const WestCoast = [ City.SanFrancisco, City.Seattle, City.LosAngeles];
const EastCost = [City.NewYork, City.Washington, City.Miami];

export type Ticket = [City, City];

export class TicketDeck extends Deck<Ticket>
{
  constructor() {
    super([
      [City.Albuquerque, City.Chicago],
      [City.Albuquerque, City.Duluth],
      [City.Albuquerque, City.Seattle],
      [City.Atlanta,     City.Montreal],
      [City.Atlanta,     City.NewYork],
      [City.Calgary,     City.Chicago],
      [City.Calgary,     City.LosAngeles],
      [City.Calgary,     City.SanFrancisco],
      [City.Chicago,     City.Helena],
      [City.Chicago,     City.Miami],
      [City.Chicago,     City.NewOrleans],
      [City.Dallas,      City.LosAngeles],
      [City.Dallas,      City.Miami],
      [City.Dallas,      City.SaltLakeCity],
      [City.Denver,      City.LosAngeles],
      [City.Denver,      City.NewOrleans],
      [City.Denver,      City.SanFrancisco],
      [City.Denver,      City.Seattle],
      [City.Duluth,      City.SaltLakeCity],
      [City.Duluth,      City.Washington],
      [City.Helena,      City.KansasCity],
      [City.KansasCity,  City.Miami],
      [City.KansasCity,  City.Montreal],
      [City.KansasCity,  City.Washington],
      [City.Montreal,    City.Winnipeg],
      [City.NewOrleans,  City.Washington],
      [City.NewYork,     City.Dallas],
      [City.NewYork,     City.Miami],
      [City.NewYork,     City.NewOrleans],
      [City.NewYork,     City.Winnipeg],
      [City.Seattle,     City.LosAngeles],
      [City.Seattle,     City.Winnipeg],
    ]);
  }
}
