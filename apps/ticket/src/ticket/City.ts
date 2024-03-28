export enum City {
  Albuquerque  = 'Albuquerque',
  Atlanta      = 'Atlanta',
  Calgary      = 'Calgary',
  Chicago      = 'Chicago',
  Dallas       = 'Dallas',
  Denver       = 'Denver',
  Duluth       = 'Duluth',
  Helena       = 'Helena',
  KansasCity   = 'KansasCity',
  LosAngeles   = 'Los Angeles',
  Miami        = 'Miami',
  Montreal     = 'Montreal',
  NewOrleans   = 'NewOrleans',
  NewYork      = 'NewYork',
  SaltLakeCity = 'Salt Lake City',
  SanFrancisco = 'San Francisco',
  Seattle      = 'Seattle',
  Washington   = 'Washington',
  Winnipeg     = 'Winnipeg',
}

export const Cities: Record<string, City> =
{
    Albuquerque:  City.Albuquerque,
    Atlanta:      City.Atlanta,
    Calgary:      City.Calgary,
    Chicago:      City.Chicago,
    Dallas:       City.Dallas,
    Denver:       City.Denver,
    Duluth:       City.Duluth,
    Helena:       City.Helena,
    KansasCity:   City.KansasCity,
    LosAngeles:   City.LosAngeles,
    Miami:        City.Miami,
    Montreal:     City.Montreal,
    NewOrleans:   City.NewOrleans,
    NewYork:      City.NewYork,
    SaltLakeCity: City.SaltLakeCity,
    SanFrancisco: City.SanFrancisco,
    Seattle:      City.Seattle,
    Washington:   City.Washington,
    Winnipeg:     City.Winnipeg,
};

export type Coords = {x:number, y:number};
export const Locations: Record<City, Coords> =
  {
    [City.Albuquerque]: {x:1343, y:1374},      //1343, 1374
    [City.Atlanta]:     {x:2610, y:1467},       //2610, 1467
    [City.Calgary]:     {x:921, y:121},           //921,121
    [City.Chicago]:     {x: 2426, y:880},          //2426, 880
    [City.Dallas]:      {x: 1905, y:1533},         //1905, 1533
    [City.Denver]:      {x:1439, y:1041},        //1439, 1041
    [City.Duluth]:      {x:2172, y:495},       //2172, 495
    [City.Helena]:      {x:1008, y:555},        //1008, 555
    [City.KansasCity]:  {x:2031, y:1088},         //2031, 1088
    [City.LosAngeles]:  {x:685, y:1446},      // 685, 1446
    [City.Miami]:       {x:2849, y:1991},        //2849, 1991
    [City.Montreal]:    {x:3226, y:595},         //3226, 595
    [City.NewOrleans]:  {x:2287, y:1721},          //2287, 1721
    [City.NewYork]:     {x:3201, y:968},      //3201, 968
    [City.SaltLakeCity]:{x:1046, y:965},        //1046, 965
    [City.SanFrancisco]:{x:448, y:1185 },     //448, 1185
    [City.Seattle]:     {x:451, y:421  },    //451, 421
    [City.Washington]:  {x: 3029, y:1102},       //3029, 1102
    [City.Winnipeg]:    {x: 1885, y:223},       //1885, 223
  };
