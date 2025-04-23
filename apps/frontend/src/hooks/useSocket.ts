import  { useEffect, useState, useCallback } from 'react'

const useSocket = () => {
    const [socket, setSocket] = useState<WebSocket>()
    const [, setIsConnected] = useState(false)

    const connect = useCallback(() => {
        const ws = new WebSocket("ws://localhost:8080")

        ws.onopen = () => {
            console.log("WebSocket connected")
            setSocket(ws)
            setIsConnected(true)
        }

        ws.onclose = () => {
            console.log("WebSocket disconnected")
            setSocket(undefined)
            setIsConnected(false)
            // Attempt to reconnect after 3 seconds
            setTimeout(connect, 3000)
        }

        ws.onerror = (error) => {
            console.error("WebSocket error:", error)
            ws.close()
        }
    }, [])

    useEffect(() => {
        connect()

        return () => {
            if (socket) {
                socket.close()
            }
        }
    }, [connect])

    return socket
}

export default useSocket
