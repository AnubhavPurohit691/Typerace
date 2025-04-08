import { WebSocket, WebSocketServer } from "ws"

interface Player{
id:string,
name:string,
score:number,
ws:WebSocket
}

export class Game{
    gameStatus: "not-started" | "in-progress" | "finished" = "not-started";
    gameId: string
    players: Player[] = [];
    gameHost: string;
    paragraph: string = "";

    constructor(roomId:string ,host:string){
        this.gameHost=host
        this.players=[]
        this.gameId=roomId
        this.gameStatus = "not-started";
        this.paragraph = "";
    }
    JoinGame(id:string,name:string,ws:WebSocket){
        if(this.gameStatus=="in-progress"){
            return 
        }
        this.players.push({id:id,name:name,score:0,ws:ws})
        this.bodcast({type:"player-joined",id:id,name:name,score:0})
        ws.send(JSON.stringify({ type: "player", players: this.players }));
        ws.send(JSON.stringify({ type: "new-host", host: this.gameHost }));

    }
    bodcast(data:any){
        this.players.forEach((players)=>{
            players.ws.send(JSON.stringify(data))
        })
    }
}