import {WebSocketServer, WebSocket} from 'ws';

type WSEvent = 'connection' | 'message' | 'error' | 'close';

export type Payload = Record<string, any>;
export type Msg<T extends Payload> = {type:string} & T;

type MsgType = string;
type Handler<T extends Payload> = (socket:WebSocket, msg:Msg<T>)=>void;

export class HiSocketServer {
  server:WebSocketServer;
  handlers:Map<MsgType,Handler<Payload>> = new Map();

  constructor(protected port:number, protected onFailure:(error:unknown)=>void) {
    this.server =  new WebSocketServer({port});
  }

  handle<T extends Payload>(msgtype:MsgType, handler:Handler<T>) {
    this.handlers.set(msgtype, handler as Handler<Payload>); // associate handler with type
  }

  start() {
    this.server.on('error',      this.onError);
    this.server.on('connection', (ws: WebSocket)=>
    {
      console.error(`connected`);

      ws.on('message', (data:unknown)=> {
        try {
          const msg = JSON.parse(data as string) as Msg<Payload>;

          const key = msg?.type;
          if (typeof key === 'string') {

            const handler = this.handlers.get(key as MsgType);

            if (handler)
              handler(ws, data as Msg<Payload>);
            else
              console.log(`no handler for key: '${key}'`);
          } else {
            console.log(`invalid key: '${key}'`, key);
          }
        } catch(err) {
          console.error(`receive error`, err);
        }

      });
    });
  }

  onError = (error:unknown) =>{
    this.onFailure(error);
  }

}

