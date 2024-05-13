import { WebSocket} from 'ws';
import * as process from 'node:process';

//@ts-ignore
import {HiSocketServer} from '../libs/utils/src/hi-socket-server';

type WSEvent = 'connection' | 'message' | 'error' | 'close';
const randomDigit = (min:number, max:number) => Math.floor(Math.random() * (max - min + 1) + min);

type Payload = Record<string, any>;
type Msg<T extends Payload> = {type:string} & T;

console.log('hello');



try {

  const server = new HiSocketServer(8080, (err:unknown)=>{
    console.log(`server error`, err);
    process.exit(1);
  });

  server.handle('hello', (ws:WebSocket, msg:Msg<{name:string}>) => {
    const timer = setInterval(() => ws.send(randomDigit(1, 10).toString()), 1000);
    ws.on('close', ()=>clearInterval(timer));
  });

  server.handle('bye', (ws:WebSocket, msg:Msg<{name:string}>) => {
    console.log(`bye`, msg);
  });


  server.start();



} catch(err ) {
  console.error(`toy-server error`, err);
}
