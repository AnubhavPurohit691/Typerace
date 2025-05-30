import { useEffect, useState, useCallback } from "react";

const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket>();
  const [, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    const ws = new WebSocket("ws://13.126.147.107:8080");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setSocket(undefined);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  return socket;
};

export default useSocket;
