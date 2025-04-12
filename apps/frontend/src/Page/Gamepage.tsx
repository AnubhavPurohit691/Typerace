import React, { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useSocket from '../hooks/useSocket'

interface Player {
  id: string;
  name: string;
  score: number;
}

const Gamepage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const socket = useSocket()
  const [players, setPlayers] = useState<Player[]>([])
  const [isHost, setIsHost] = useState(false)
  const [paragraph, setParagraph] = useState('')
  const [typedText, setTypedText] = useState('')
  const [gameStatus, setGameStatus] = useState<'not-started' | 'in-progress' | 'finished'>('not-started')
  const [timeLeft, setTimeLeft] = useState(60)
  const data = location.state || {}
  const joinedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Calculate winner
  const getWinner = () => {
    if (players.length === 0) return null
    return players.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    )
  }

  useEffect(() => {
    // Validate required data
    if (!data.roomId || !data.name || !data.playerId) {
      navigate('/')
      return
    }

    if (!socket) return

    // Handle socket messages
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'players') {
          // Ensure unique players by ID
          const uniquePlayers = message.players.reduce((acc: Player[], current: Player) => {
            const exists = acc.find(p => p.id === current.id)
            if (!exists) {
              acc.push(current)
            }
            return acc
          }, [])
          setPlayers(uniquePlayers)
        }
         if (message.type === 'player-joined') {
          setPlayers(prevPlayers => {
            const playerExists = prevPlayers.some(p => p.id === message.id)
            if (!playerExists) {
              return [...prevPlayers, { id: message.id, name: message.name, score: message.score }]
            }
            return prevPlayers
          })
        }
        else if (message.type === 'player-leave') {
          setPlayers(prevPlayers => prevPlayers.filter(p => p.id !== message.id))
        }
        else if (message.type === 'new-host') {
          setIsHost(message.host === data.playerId)
        }
        else if (message.type === 'player-score') {
          setPlayers(prevPlayers => 
            prevPlayers.map(p => 
              p.id === message.id ? { ...p, score: message.score } : p
            )
          )
        }
        else if (message.type === 'game-started') {
          setParagraph(message.paragraph)
          setGameStatus('in-progress')
          setTimeLeft(60)
          setTypedText('')
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }
        else if (message.type === 'game-finished') {
          setGameStatus('finished')
        }
      } catch (error) {
        console.error('Error handling message:', error)
      }
    }

    // Set up socket event handlers
    socket.onmessage = handleMessage
    socket.onclose = () => {
      navigate('/')
    }

    // Join the game room
    if (!joinedRef.current && socket.readyState === WebSocket.OPEN) {
      const joinMessage = {
        type: 'Join-game',
        roomId: data.roomId,
        name: data.name,
        playerId: data.playerId
      }
      socket.send(JSON.stringify(joinMessage))
      joinedRef.current = true
      
      // Immediately request the current player list
      setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'request-players',
            roomId: data.roomId
          }))
        }
      }, 300)
    }
    
    // Set up a polling mechanism for hosts to ensure they always see latest players
    let intervalId: number | null = null
    
    if (isHost) {
      intervalId = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'request-players',
            roomId: data.roomId
          }))
        }
      }, 3000) // Poll every 3 seconds
    }

    // Cleanup function
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const leaveMessage = {
          type: 'leave',
          roomId: data.roomId,
          playerId: data.playerId
        }
        socket.send(JSON.stringify(leaveMessage))
        socket.onmessage = null
        socket.onclose = null
      }
      
      // Clear the polling interval
      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
      
      joinedRef.current = false
    }
  }, [socket, data, navigate, isHost]) // Added isHost to dependencies

  // Timer effect
  useEffect(() => {
    if (gameStatus !== 'in-progress') return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus])

  // Check if socket is active and ready
  const isSocketConnected = socket && socket.readyState === WebSocket.OPEN

  const handleStartGame = () => {
    if (socket && isHost && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: 'start-game',
        roomId: data.roomId 
      }))
    }
  }
  
  // Manual refresh button for players list
  const refreshPlayersList = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'request-players',
        roomId: data.roomId
      }))
    }
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameStatus !== 'in-progress') return

    const newText = e.target.value
    setTypedText(newText)

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'player-typing',
        roomId: data.roomId,
        playerId: data.playerId,
        typed: newText
      }))
    }
  }

  // Sort players to maintain consistent order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score) // Sort by score descending
  const winner = getWinner()

  return (
    <div className="game-container">
      {!isSocketConnected ? (
        <div>Connecting to server...</div>
      ) : (
        <>
          <div className="status">
            Connected to game room: {data.roomId}
            {gameStatus === 'in-progress' && <div>Time left: {timeLeft} seconds</div>}
          </div>
          
          <div className="players-list">
            <div className="header-row">
              <h2>Players in Room:</h2>
              <button onClick={refreshPlayersList} className="refresh-button">
                Refresh
              </button>
            </div>
            
            {sortedPlayers.length > 0 ? (
              <ul>
                {sortedPlayers.map((player) => (
                  <li key={player.id} className={gameStatus === 'finished' && winner?.id === player.id ? 'winner' : ''}>
                    {player.name} - Score: {player.score}
                    {data.playerId === player.id ? " (You)" : ""}
                    {isHost && data.playerId === player.id ? " (Host)" : ""}
                    {gameStatus === 'finished' && winner?.id === player.id && " 🏆"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No players in the room yet</p>
            )}
          </div>
          
          {gameStatus === 'in-progress' && (
            <div className="typing-section">
              <div className="paragraph-display">
                {paragraph.split('').map((char, index) => {
                  const typedChar = typedText[index]
                  const isCorrect = typedChar === char
                  return (
                    <span 
                      key={index} 
                      style={{ 
                        color: typedChar ? (isCorrect ? 'green' : 'red') : 'black',
                        textDecoration: typedChar && !isCorrect ? 'underline' : 'none'
                      }}
                    >
                      {char}
                    </span>
                  )
                })}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={typedText}
                onChange={handleTyping}
                disabled={gameStatus !== 'in-progress'}
                placeholder="Start typing..."
                className="typing-input"
              />
            </div>
          )}
          
          {gameStatus === 'finished' && winner && (
            <div className="winner-section">
              <h2>Game Over!</h2>
              <div className="winner-announcement">
                🎉 {winner.name} wins with {winner.score} points! 🎉
              </div>
            </div>
          )}
          
          {isHost && gameStatus === 'not-started' && (
            <button 
              onClick={handleStartGame} 
              disabled={sortedPlayers.length < 2}
              className="start-button"
            >
              Start Game ({sortedPlayers.length} players)
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default Gamepage