import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Createroom = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const navigate = useNavigate();

  const handleJoinGame = () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

 
    const normalizedRoomId = roomId.trim().toLowerCase();
    
    const playerId = uuid();
    navigate("/game", {
      state: {
        roomId: normalizedRoomId,
        name: name.trim(),
        playerId: playerId
      }
    });
  };

  

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/10"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-center mb-2 text-white">
            Type Race
          </h1>
          <p className="text-center text-gray-300 mb-8">Test your typing speed against friends</p>
        </motion.div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-gray-300">Your Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder:text-gray-500 focus:ring-2 focus:ring-white/20 focus:outline-none"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="roomid" className="text-sm font-medium text-gray-300">Room ID</label>
            <div className="flex space-x-3">
              <input
                id="roomid"
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder:text-gray-500 focus:ring-2 focus:ring-white/20 focus:outline-none"
              />
              
            </div>
          </div>
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="pt-4"
          >
            <button 
              onClick={handleJoinGame}
              className="w-full py-6 text-lg font-medium bg-white text-black hover:bg-gray-200 rounded-md transition-colors duration-200 shadow-lg"
            >
              Join Game
            </button>
          </motion.div>
          
          <div className="text-center text-gray-400 text-sm mt-6">
            <p>Create a new room or join an existing one with a room ID</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Createroom;
