import {Color} from './Color';
import {City} from './City';

type Cost = 1|2|3|4;                 // cost is integer from 1 - 4 inclusive
type CityPair = [City,City];         // always two cities connected by route
type RouteColors = [Color, Color?];  // only one or two colors per route
export type Route = { cost:Cost, color:Color, cities:CityPair };


export const Routes: Route[] = [
  {cities: [City.Albuquerque, City.Dallas],        cost: 2, color:Color.Black},
  {cities: [City.Albuquerque, City.Dallas],        cost: 2, color:Color.Green},

  {cities: [City.Albuquerque, City.Denver],        cost: 1, color:Color.Red},

  {cities: [City.Albuquerque, City.LosAngeles],    cost: 3, color:Color.Blue},
  {cities: [City.Albuquerque, City.LosAngeles],    cost: 3, color: Color.White},

  {cities: [City.Albuquerque, City.SaltLakeCity],  cost: 2, color:Color.Yellow},
  {cities: [City.Atlanta, City.Chicago],           cost: 2, color:Color.Green},
  {cities: [City.Atlanta, City.Dallas],            cost: 3, color:Color.White},
  {cities: [City.Atlanta, City.KansasCity],        cost: 3, color:Color.Blue},
  {cities: [City.Atlanta, City.Miami],             cost: 2, color:Color.Black},
  {cities: [City.Atlanta, City.Miami],             cost: 2, color:Color.Blue},

  {cities: [City.Atlanta, City.NewOrleans ],       cost: 1, color:Color.Black},
  {cities: [City.Atlanta, City.NewOrleans ],       cost: 1, color: Color.Red},

  {cities: [City.Atlanta, City.Washington ],       cost: 2, color:Color.Yellow},
  {cities: [City.Atlanta, City.Washington ],       cost: 2, color: Color.White},

  {cities: [City.Calgary, City.Helena],            cost: 1, color:Color.Red},
  {cities: [City.Calgary, City.Helena],            cost: 1, color:Color.White},

  {cities: [City.Calgary, City.Seattle],           cost: 3, color:Color.Black},
  {cities: [City.Calgary, City.Seattle],           cost: 3, color:Color.Red},

  {cities: [City.Calgary, City.Winnipeg],          cost: 3, color:Color.Yellow},
  {cities: [City.Calgary, City.Winnipeg],          cost: 3, color:Color.Green},

  {cities: [City.Chicago, City.Duluth],            cost: 1, color:Color.Blue},
  {cities: [City.Chicago, City.Duluth],            cost: 1, color:Color.Red},

  {cities: [City.Chicago, City.KansasCity, ],      cost: 1, color:Color.Black},
  {cities: [City.Chicago, City.KansasCity, ],      cost: 1, color:Color.Yellow},

  {cities: [City.Chicago, City.Montreal ],         cost: 3, color:Color.Yellow},
  {cities: [City.Chicago, City.NewYork ],          cost: 3, color:Color.Red},
  {cities: [City.Chicago, City.NewYork ],          cost: 3, color:Color.White},

  {cities: [City.Chicago, City.Washington ],       cost: 3, color:Color.Black},
  {cities: [City.Dallas, City.KansasCity ],        cost: 1, color:Color.Red},
  {cities: [City.Dallas, City.KansasCity ],        cost: 1, color:Color.Yellow},

  {cities: [City.Dallas, City.NewOrleans],         cost: 2, color:Color.Blue},
  {cities: [City.Dallas, City.NewOrleans],         cost: 2, color:Color.Red},

  {cities: [City.Denver, City.Duluth],             cost: 4, color:Color.Black},
  {cities: [City.Denver, City.Helena],             cost: 2, color:Color.Yellow},
  {cities: [City.Denver, City.KansasCity],         cost: 2, color:Color.Green},
  {cities: [City.Denver, City.KansasCity],         cost: 2, color:Color.White},

  {cities: [City.Denver, City.SaltLakeCity],       cost: 2, color:Color.Black},
  {cities: [City.Denver, City.SaltLakeCity],       cost: 2, color:Color.Blue},

  {cities: [City.Duluth, City.KansasCity ],        cost: 2, color:Color.White},
  {cities: [City.Duluth, City.Montreal],           cost: 3, color:Color.Blue},
  {cities: [City.Duluth, City.Montreal],           cost: 3, color:Color.Green},

  {cities: [City.Duluth, City.Winnipeg],           cost: 1, color:Color.Black},
  {cities: [City.Duluth, City.Winnipeg],           cost: 1, color:Color.Red},

  {cities: [City.Helena, City.SaltLakeCity],       cost: 1, color:Color.Green, },
  {cities: [City.Helena, City.SaltLakeCity],       cost: 1, color:Color.Black},

  {cities: [City.Helena, City.Seattle],            cost: 2, color:Color.Yellow},
  {cities: [City.Helena, City.Winnipeg],           cost: 3, color:Color.Blue},
  {cities: [City.LosAngeles, City.SaltLakeCity],   cost: 2, color:Color.Red},
  {cities: [City.LosAngeles, City.SanFrancisco],   cost: 1, color:Color.Red},
  {cities: [City.LosAngeles, City.SanFrancisco],   cost: 1, color:Color.Black},

  {cities: [City.Miami, City.Washington],          cost: 4, color:Color.Green},
  {cities: [City.Miami, City.Washington],          cost: 4, color:Color.Red},

  {cities: [City.Miami, City.NewOrleans],          cost: 3, color:Color.Yellow},
  {cities: [City.Miami, City.NewOrleans],          cost: 3, color:Color.White},

  {cities: [City.Montreal, City.NewYork ],         cost: 1, color:Color.Black},
  {cities: [City.Montreal, City.NewYork ],         cost: 1, color:Color.White},

  {cities: [City.NewYork, City.Washington ],       cost: 1, color:Color.Blue},
  {cities: [City.NewYork, City.Washington ],       cost: 1, color:Color.Yellow},

  {cities: [City.SaltLakeCity, City.Seattle],      cost: 3, color:Color.White},
  {cities: [City.SaltLakeCity, City.SanFrancisco], cost: 2, color:Color.Green},
  {cities: [City.SaltLakeCity, City.SanFrancisco], cost: 2, color:Color.Yellow},

  {cities: [City.SanFrancisco, City.Seattle],      cost: 3, color:Color.Green},
  {cities: [City.SanFrancisco, City.Seattle],      cost: 3, color:Color.Blue},

];

