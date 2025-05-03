import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useSocket from "../hooks/useSocket";

interface Player {
  id: string;
  name: string;
  score: number;
}

const Gamepage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [paragraph, setParagraph] = useState("");
  const [typedText, setTypedText] = useState("");
  const [gameStatus, setGameStatus] = useState<
    "not-started" | "in-progress" | "finished"
  >("not-started");
  const [timeLeft, setTimeLeft] = useState(60);
  const data = location.state || {};
  const joinedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate winner
  const getWinner = () => {
    if (players.length === 0) return null;
    return players.reduce((prev, current) =>
      prev.score > current.score ? prev : current,
    );
  };

  useEffect(() => {
    // Validate required data
    if (!data.roomId || !data.name || !data.playerId) {
      navigate("/");
      return;
    }

    if (!socket) return;

    // Handle socket messages
    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "players") {
          // Ensure unique players by ID
          const uniquePlayers = message.players.reduce(
            (acc: Player[], current: Player) => {
              const exists = acc.find((p) => p.id === current.id);
              if (!exists) {
                acc.push(current);
              }
              return acc;
            },
            [],
          );
          setPlayers(uniquePlayers);
        } else if (message.type === "player-joined") {
          setPlayers((prevPlayers) => {
            const playerExists = prevPlayers.some((p) => p.id === message.id);
            if (!playerExists) {
              return [
                ...prevPlayers,
                {
                  id: message.id,
                  name: message.name,
                  score: message.score || 0,
                },
              ];
            }
            return prevPlayers;
          });
        } else if (message.type === "player-leave") {
          setPlayers((prevPlayers) =>
            prevPlayers.filter((p) => p.id !== message.id),
          );
        } else if (message.type === "new-host") {
          setIsHost(message.host === data.playerId);
        } else if (message.type === "player-score") {
          setPlayers((prevPlayers) =>
            prevPlayers.map((p) =>
              p.id === message.id ? { ...p, score: message.score } : p,
            ),
          );
        } else if (message.type === "game-started") {
          setParagraph(message.paragraph);
          setGameStatus("in-progress");
          setTimeLeft(60);
          setTypedText("");
          if (inputRef.current) {
            inputRef.current.focus();
          }
        } else if (message.type === "game-finished") {
          setGameStatus("finished");
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    };

    // Set up socket event handlers
    socket.onmessage = handleMessage;
    socket.onclose = () => {
      navigate("/");
    };

    // Join the game room
    if (!joinedRef.current && socket.readyState === WebSocket.OPEN) {
      const joinMessage = {
        type: "Join-game",
        roomId: data.roomId,
        name: data.name,
        playerId: data.playerId,
      };
      socket.send(JSON.stringify(joinMessage));
      joinedRef.current = true;

      // Immediately request the current player list
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "request-players",
              roomId: data.roomId,
            }),
          );
        }
      }, 300);
    }

    // Set up a polling mechanism for hosts to ensure they always see latest players
    let intervalId: number | null = null;

    if (isHost) {
      intervalId = window.setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: "request-players",
              roomId: data.roomId,
            }),
          );
        }
      }, 3000); // Poll every 3 seconds
    }

    // Cleanup function
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const leaveMessage = {
          type: "leave",
          roomId: data.roomId,
          playerId: data.playerId,
        };
        socket.send(JSON.stringify(leaveMessage));
        socket.onmessage = null;
        socket.onclose = null;
      }

      // Clear the polling interval
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      joinedRef.current = false;
    };
  }, [socket, data, navigate, isHost]);

  // Timer effect
  useEffect(() => {
    if (gameStatus !== "in-progress") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus]);

  // Check if socket is active and ready
  const isSocketConnected = socket && socket.readyState === WebSocket.OPEN;

  const handleStartGame = () => {
    if (socket && isHost && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "start-game",
          roomId: data.roomId,
        }),
      );
    }
  };

  // Manual refresh button for players list
  const refreshPlayersList = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "request-players",
          roomId: data.roomId,
        }),
      );
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameStatus !== "in-progress") return;

    const newText = e.target.value;
    setTypedText(newText);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "player-typing",
          roomId: data.roomId,
          playerId: data.playerId,
          typed: newText,
        }),
      );
    }
  };

  // Sort players to maintain consistent order
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score); // Sort by score descending
  const winner = getWinner();

  // Wrapper variants for animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen flex flex-col items-center p-4 sm:p-8"
    >
      {!isSocketConnected ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/10 w-full max-w-2xl"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
            <p className="text-xl font-medium">Connecting to server...</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="w-full max-w-4xl space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md rounded-xl p-4 flex justify-between items-center border border-white/10 shadow-lg"
          >
            <div>
              <h2 className="text-xl font-bold text-gray-200">
                Room: <span className="text-white">{data.roomId}</span>
              </h2>
              <p className="text-gray-400">
                Joined as: <span className="font-semibold">{data.name}</span>{" "}
                {isHost && (
                  <span className="ml-1 bg-white/10 text-white px-2 py-0.5 rounded-full text-xs">
                    HOST
                  </span>
                )}
              </p>
            </div>

            {gameStatus === "in-progress" && (
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{timeLeft}</div>
                <div className="text-xs text-gray-400">seconds left</div>
                <div className="mt-2 w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-1000"
                    style={{ width: `${(timeLeft / 60) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Players List */}
          <motion.div
            className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/10">
              <h3 className="font-semibold text-lg">Players</h3>
              <button
                onClick={refreshPlayersList}
                className="text-sm px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="p-4">
              {sortedPlayers.length > 0 ? (
                <ul className="space-y-2">
                  {sortedPlayers.map((player, index) => (
                    <motion.li
                      key={player.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        gameStatus === "finished" && winner?.id === player.id
                          ? "bg-white/20 border border-white/30"
                          : "bg-white/5 border border-white/10"
                      } ${data.playerId === player.id ? "border-l-4 border-l-white" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {player.name}
                            {data.playerId === player.id && (
                              <span className="ml-2 text-xs text-gray-400">
                                (You)
                              </span>
                            )}
                            {isHost && player.id === data.playerId && (
                              <span className="ml-1 text-xs text-gray-400">
                                (Host)
                              </span>
                            )}
                          </div>
                          {gameStatus === "in-progress" && (
                            <div className="w-32 h-1 bg-white/10 rounded-full mt-1">
                              <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${player.score}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {player.score}
                        {gameStatus === "finished" &&
                          winner?.id === player.id && (
                            <span className="ml-2">🏆</span>
                          )}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-center py-4 text-gray-400">
                  No players in the room yet
                </p>
              )}
            </div>
          </motion.div>

          {/* Typing Game */}
          {gameStatus === "in-progress" && (
            <motion.div
              className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="paragraph-display mb-6 p-4 bg-white/5 rounded-lg border border-white/10 font-mono text-lg leading-relaxed">
                {paragraph.split("").map((char, index) => {
                  const typedChar = typedText[index];
                  const isCorrect = typedChar === char;
                  const isCurrent = index === typedText.length;

                  return (
                    <span
                      key={index}
                      className={`
                        ${typedChar ? (isCorrect ? "text-green-400" : "text-red-400 underline") : "text-white/70"}
                        ${isCurrent ? "bg-white/20 animate-pulse" : ""}
                      `}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={typedText}
                onChange={handleTyping}
                disabled={gameStatus !== "in-progress"}
                placeholder="Start typing..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 font-mono"
                autoComplete="off"
              />
            </motion.div>
          )}

          {/* Game Over */}
          {gameStatus === "finished" && winner && (
            <motion.div
              className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-lg text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.3,
              }}
            >
              <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
              <div className="winner-announcement py-6">
                <div className="text-xl mb-2">Winner</div>
                <div className="text-4xl font-bold text-white">
                  {winner.name}
                </div>
                <div className="mt-2 text-2xl text-gray-300">
                  {winner.score} points
                </div>
                <div className="flex justify-center my-4">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.5 + i * 0.1,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className="text-4xl mx-1"
                    >
                      🏆
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Host Controls */}
          {isHost && gameStatus === "not-started" && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center"
            >
              <button
                onClick={handleStartGame}
                disabled={sortedPlayers.length < 2}
                className={`px-8 py-4 rounded-full text-lg font-semibold shadow-lg transition-all duration-300
                  ${
                    sortedPlayers.length < 2
                      ? "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                      : "bg-white text-black hover:bg-gray-200"
                  }
                `}
              >
                Start Game ({sortedPlayers.length} players)
              </button>
              {sortedPlayers.length < 2 && (
                <p className="mt-2 text-gray-400 text-sm">
                  Need at least 2 players to start
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Gamepage;
