// based on https://github.com/CaptainLuma/New-Maze-Generating-Algorithm/blob/main/main.js

// copied two functions from random //todo put random into utils library, so other utils don't need it
const cells = {
  nw: 0x250C,
  ne: 0x2510,
  sw: 0x2514,
  se: 0x2518,
};

  //https://alanflavell.org.uk/unicode/unidata25.html


function randomRange(min:number, max:number):number { return Math.floor(Math.random() * (max - min + 1) + min); }
function randomValue<T>(arr:T[]):T
 {
    if(!arr?.length) {
      console.error(`randomValue of bad array`, arr)
      throw new Error(`randomValue of bad array`,)
    }
  const index = randomRange(0, arr.length-1);
  if(index >= arr.length + 1) {
    return arr[0];
  }
  return arr[index] ;

}

// my random value function should fail tests!

type Direction = 'N'|'S'|'E'|'W';
const arrows = {N: '↑',S:'↓', W:'←', E:'→'};
type Freedom = Direction[];
// opposite of terminals
const freedoms:Record<string,Freedom> = {
   n:[     'S', 'E', 'W'],
   s:['N',      'E', 'W'],
   e:['N', 'S',      'W'],
   w:['N', 'S', 'E'     ],
  ne:[     'S',      'W'],
  se:['N',           'W'],
  sw:['N',      'E'     ],
  nw:[     'S', 'E'     ],
none:['N', 'S', 'E', 'W']
};



type Room = {free:Freedom, enterFrom:Freedom, leadsTo:Direction|undefined, walledSides?:Freedom};

export class Maze {
  protected rooms: Room[];
  protected readonly width:number;
  protected readonly height:number;
  protected origin:number ; // index of the "origin' room
  protected priorOrigin:number|undefined;

  static createMaze(width: number, height:number, iterations: number): Maze {
    let m = new Maze(width, height);
    for(let i = 0; i < iterations; ++i)
       m = m.iterate();
    return m;
  }

  protected constructor(width: number, height:number);     // standard constructor build a maze from scratch
  protected constructor(width: number, height:number, maze: Room[], origin: number, priorOrigin:number);  // used by iterate to create a new one

  protected constructor(width: number, height: number, maze?: Room[], origin?: number, priorOrigin?:number) {
    this.width = width;
    this.height = height;
    if(width < 2 || height < 2)
      throw new Error(`maze must exceed 2x2 size`);
    if(maze) {
      if(typeof origin  !== 'number' || origin < 0 || origin >= this.width * this.height)
        throw new Error(`maze origin constructor must provide valid origin from 0..${width*height-1}, received ${origin}`);
      this.rooms   = maze;
      this.origin = origin;
    } else {
      this.origin = width * height - 1;
      this.rooms = this.generateMaze(width, height);
    }
    this.priorOrigin = priorOrigin;
  }

  protected generateMaze(width: number, height: number): Room[] {
    const size = width * height;
    return <Room[]>Array.from(
      Array(size),
      (_, i) => {
        // for all values of i, point East
        const nextI = i+1;

        // a room is the terminal room for up to two directions
        const nT = i < width;
        const sT = size - width <= i;
        const wT = i % width === 0;
        const eT = nextI % width === 0;

        // all Rooms in a row point East,
        // except for last column which point South,
        // except for last Point which points nowhere
        const leadsTo = !eT ? 'E': nextI !== size? 'S': undefined;

        const free: Direction[] = nT? (wT? freedoms.nw: eT? freedoms.ne: freedoms.n) :
                                  sT? (wT? freedoms.sw: eT? freedoms.se: freedoms.s) :
                                       wT? freedoms.w : eT? freedoms.e:  freedoms.none;

        const enterFrom = leadsTo === 'E'? (wT? []:['W']): leadsTo === 'S'? (nT? ['W']:['N','W']): ['N','W'];

        return {free: free, enterFrom, leadsTo}
      }
      );
  }

  // performs one mutation on the grid by returning a new one
  public iterate(): Maze
  {
      const width  = this.width;
      const height = this.height;
      const rooms  = [...this.rooms];
      if(rooms.length < width * height)
        throw new Error(`Maze rooms is not sized to (${width}*${height}), but rather to ${rooms.length}`);
      if(this.origin < 0 || this.origin >= width*height)
        throw new Error(`Maze room origin is ${this.origin}, but it exceeds bounds of 0-${width*height-1}`);

      let direction;
      const p = this.origin;
      const po = this.priorOrigin;
      let n = p;
      // the old origin gains no new entry
      // the new entry no longer leads anywhere
      // but the new entry gains the direction of the old origin as an enterFrom

      let enter:Direction;
      do {
        n = p;
        direction = randomValue<Direction>(rooms[this.origin].free); // pick a new origin
        switch(direction) {
          case 'N':  n -= width; enter = 'S'; break;
          case 'S':  n += width; enter = 'N'; break;
          case 'E':  ++n;        enter = 'W'; break;
          default:   --n;        enter = 'E'; // west
        }
      } while (po !== undefined && n === po); // don't chose a direction that puts us right back where we were before here

      if(n >= width*height)
        throw new Error(`Exceeding bounds`);

    // only two rooms are impacted by any iteration the old origin leads to the new one, the new one leads nowhere
      rooms[p] = {...rooms[p], leadsTo: direction};
      const pLeadsTo = rooms[n].leadsTo;
      let x = n;
      let leaves: Direction;
      switch(pLeadsTo) {
        case 'N':  x -= width; leaves = 'S'; break;
        case 'S':  x += width; leaves = 'N'; break;
        case 'E':  ++x;        leaves = 'W'; break;
        default:   --x;        leaves = 'E'; // west
      }

      const nenterFrom = rooms[x].enterFrom.filter(d=>d !== leaves);
      rooms[x] = {...rooms[x], enterFrom:nenterFrom};
      rooms[n] = {...rooms[n], enterFrom:[...rooms[n].enterFrom, enter], leadsTo: undefined};

      return new Maze(width, height, rooms, n, this.origin);
  }

  public addWalls():void
  {
    //  add walledSides to every room as a convenience for printing purposes
    // each room is certainly walled where it has no neighbor (sides and corners)
    // there is no wall in direction of something pointing to it
    // there is no wall in direction it leads to
    // const allwalls = freedoms.none;
    //
    // const size = this.width * this.height;
    // for(let start=0; start < size; start += this.width ) {
    //   for(let i = start; i < this.width; ++i)
    //   {
    //     const room = {...this.rooms[i]};
    //     const w = allwalls.filter(v=>v === room.leadsTo)
    //
    //     this.rooms[i] = room;
    //   }
    // }

  }

  public print():string
  {
    let s = '';
    const size = this.width * this.height;

    // this.addWalls();

    for(let start=0; start < size; start += this.width ) {
      const end = start + this.width;
      //@ts-ignore
      s += this.rooms.slice(start,end).map(room => arrows[room.leadsTo] ?? 'O').join('');
      s += '\n'
    }
    return s;
  }
}

  const w = 5;
  const h = 4;
  let maze: Maze = Maze.createMaze(w, h, h*w*100);
  for (let i = 0; i < 10; i++) {
    console.log(`[i] ------------------------------`)
    console.log(maze.print());
    maze = maze.iterate()
  }
