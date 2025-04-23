import { useState } from 'react'
import {v4 as uuid} from 'uuid'
import { useNavigate } from 'react-router-dom'

const Createroom = () => {
  const [roomid, setroomid] = useState<string>('')
  const [name, setname] = useState<string>('')
  const navigate = useNavigate()

  const handleJoinGame = () => {
    if (!name.trim()) {
      alert('Please enter your name')
      return
    }

    if (!roomid.trim()) {
      alert('Please enter a room ID')
      return
    }

    // Normalize room ID (trim and convert to lowercase)
    const normalizedRoomId = roomid.trim().toLowerCase()
    
    const playerId = uuid()
    navigate("/game", {
      state: {
        roomId: normalizedRoomId,
        name: name.trim(),
        playerId: playerId
      }
    })
  }

  return (
    <div>
      <h1>Welcome to the game</h1>
      <input 
        type="text" 
        placeholder='Enter your name' 
        value={name}
        onChange={(e) => setname(e.target.value)} 
      />
      <input 
        type="text" 
        placeholder='Enter room id' 
        value={roomid}
        onChange={(e) => setroomid(e.target.value)} 
      />
      <button onClick={handleJoinGame}>Join Game</button>
    </div>
  )
}

export default Createroom