import { WebSocket } from "ws";
import { Game } from "./Game";


export const rooms = new Map<string, Game>();

export function setupListener(ws: WebSocket) {
ws.on("message",(data)=>{
const parsedmessage=JSON.parse(data.toString())
if(parsedmessage.type==="Join-game"){
  const roomId=parsedmessage.roomId
  const name = parsedmessage.name
  const playerId=parsedmessage.playerId

  if(rooms.has(roomId)){
  const game = rooms.get(roomId)
  
  if(!game){
    return 
  }  
  game.JoinGame(playerId,name,ws)  
  }
  else{
    const game=new Game(roomId,playerId)
    rooms.set(roomId,game)
    game.JoinGame(playerId,name,ws)
  }
}
})
}