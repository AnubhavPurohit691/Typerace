import { WebSocket, WebSocketServer } from "ws"
import { generateParagraph } from "./generateparagraph";
import { rooms } from "./setuplisteners";

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
            if(parseddata.type=="player-typing"){
                if(this.gameStatus!=="in-progress"){
                    return
                }
                this.updateScore(playerid,parseddata.typed)
            }
        })

        ws.on("close", () => {
            this.removePlayer(playerid);
        });
    }

    JoinGame(id:string,name:string,ws:WebSocket){
        if(this.gameStatus=="in-progress"){
            return 
        }
        this.players.push({id:id,name:name,score:0,ws:ws})
        this.bodcast({type:"player-joined",id:id,name:name,score:0})
        ws.send(JSON.stringify({ type: "players", players: this.players }));
        ws.send(JSON.stringify({ type: "new-host", host: this.gameHost }));
        this.maingamelogic(ws,id)

    }

    updateScore(playerId:string,typed:string){
        const typedwords=typed.split(" ")
        const paragraphWords = this.paragraph.split(" ")
        let score=0;
        for(let i=0;i<typedwords.length;i++){
            if(typedwords[i]===paragraphWords[i]){
                score++;
            }
            else{
                break;
            }
        }
        const player=this.players.find((p)=>p.id ===playerId)
        if(player) player.score=score
        this.bodcast({type:"player-score",id:playerId,score})
    }

    removePlayer(playerId:string){
        this.players=this.players.filter(p=>p.id!==playerId)
        this.bodcast({type:"player-leave",id:playerId})
        if(this.gameHost===playerId && this.players.length>0){
            this.gameHost=this.players[0]!.id
            this.bodcast({type:"new-host", host:this.gameHost})
        }
        if(this.players.length===0){
           rooms.delete(this.gameId) 
        }
        
    }


    bodcast(data:any){
        this.players.forEach((players)=>{
            players.ws.send(JSON.stringify(data))
        })
    }
}