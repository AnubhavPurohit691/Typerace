import { WebSocket, WebSocketServer } from "ws"
import { generateParagraph } from "./generateparagraph";

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
    maingamelogic(ws:WebSocket,playerid:string){
        ws.on("message",(data:string)=>{
            const parseddata=JSON.parse(data)

            if(parseddata.type=="start-game"){
                if(this.gameStatus==="in-progress"){
                    return 
                }
                if(this.gameHost!==playerid){
                    return
                }
                this.players.forEach((player)=>player.score=0)
                this.bodcast({type:"players",players:this.players})
                this.paragraph=generateParagraph()
                this.gameStatus="in-progress"
                this.bodcast({type:"game-started",paragraph:this.paragraph})

                setTimeout(() => {
                    this.gameStatus="finished"
                    this.bodcast({type:"game-finished"})
                    this.bodcast({type:"players",players:this.players})
                }, 60000);
            }
        })
    }
    JoinGame(id:string,name:string,ws:WebSocket){
        if(this.gameStatus=="in-progress"){
            return 
        }
        this.players.push({id:id,name:name,score:0,ws:ws})
        this.bodcast({type:"player-joined",id:id,name:name,score:0})
        ws.send(JSON.stringify({ type: "player", players: this.players }));
        ws.send(JSON.stringify({ type: "new-host", host: this.gameHost }));
        this.maingamelogic(ws,id)

    }
    bodcast(data:any){
        this.players.forEach((players)=>{
            players.ws.send(JSON.stringify(data))
        })
    }
}