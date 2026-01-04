import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../socket";
import useRateLimiting from "../hooks/useRateLimiting";

const Lobby = () => {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const { isRateLimited, remainingTime } = useRateLimiting();
  const navigate = useNavigate();

  const joinGame = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    if (joined) return;
    
    // Don't attempt to join if rate limited
    if (isRateLimited) {
      setError(`Server is rate limited. Please wait ${remainingTime} seconds before trying again.`);
      return;
    }

    const cleanedName = trimmed; // keep original case

    try {
      const socket = await getSocket();
      console.log("🔗 Emitting joinGame:", cleanedName);
      socket.emit("joinGame", cleanedName);
      setJoined(true);
      setError("");
      setConnectionError(false);
    } catch (error) {
      console.error("Failed to join game:", error);
      
      // Check if error is rate limiting related
      if (error.message && (
          error.message.includes('429') || 
          error.message.includes('Too Many Requests') ||
          error.message.toLowerCase().includes('rate limit')
      )) {
        setError(`Too Many Requests (429). Please wait ${remainingTime || 60} seconds before trying again.`);
      } else {
        setError("Failed to connect to server. Please try again.");
        setConnectionError(true);
      }
      
      setJoined(false);
    }
  };

  useEffect(() => {
    const initializeLobbySocket = async () => {
      const handleGameStarted = ({ gameId, players, turn }) => {
        console.log("✅ Game started with ID:", gameId, "Players:", players, "Turn:", turn);

        const cleanedName = name.trim();
        const opponent = players.find((p) => p !== cleanedName) || "BotMaster";

        navigate(`/game/${gameId}`, {
          state: {
            username: cleanedName,
            gameId,
            opponent,
            turn: turn, // keep original case
          },
        });
      };

      try {
        // Check for rate limiting before attempting to get socket
        if (isRateLimited) {
          console.log(`⚠️ Rate limited. Waiting ${remainingTime}s before connecting socket.`);
          setError(`Server is rate limited. Please wait ${remainingTime} seconds.`);
          return () => {}; // Empty cleanup function
        }
        
        const socket = await getSocket();
        socket.on("gameStarted", handleGameStarted);
        
        // Reset connection error if successful
        setConnectionError(false);
        
        return () => {
          socket.off("gameStarted", handleGameStarted);
        };
      } catch (error) {
        console.error("Failed to initialize lobby socket:", error);
        
        // Check if error is rate limiting related
        if (error.message && (
            error.message.includes('429') || 
            error.message.includes('Too Many Requests') ||
            error.message.toLowerCase().includes('rate limit')
        )) {
          setError(`Too Many Requests (429). Please wait before trying again.`);
        } else {
          setConnectionError(true);
        }
      }
    };

    const cleanup = initializeLobbySocket();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn()).catch(console.error);
    };
  }, [name, navigate, isRateLimited, remainingTime]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b1d1f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "50px 20px",
        color: "#fff",
      }}
    >
      <div
        style={{
          backgroundColor: "#122c2f",
          borderRadius: "20px",
          padding: "40px",
          maxWidth: "500px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "32px", color: "#fff", marginBottom: "20px" }}>
          Enter Your Name to Play
        </h2>
        
        <div style={{ 
          backgroundColor: "#0b1d1f", 
          padding: "20px", 
          borderRadius: "15px", 
          marginBottom: "30px",
          border: "2px solid #6ee7b7",
          userSelect: "none",
          cursor: "default"
        }}>
          <h3 style={{ 
            fontSize: "20px", 
            color: "#6ee7b7", 
            marginBottom: "15px",
            userSelect: "none",
            cursor: "default"
          }}>
            🎯 How to Play Connect4
          </h3>
          <p style={{ 
            fontSize: "16px", 
            color: "#fff", 
            lineHeight: "1.6", 
            margin: "0 0 15px 0",
            userSelect: "none",
            cursor: "default"
          }}>
            Get <strong>4 in a Row</strong> to win! Connect your pieces horizontally, vertically, or diagonally. 
            Drop your disc into any column and try to block your opponent while building your winning line!
          </p>
          <p style={{ 
            fontSize: "14px", 
            color: "#6ee7b7", 
            lineHeight: "1.4", 
            margin: "0",
            userSelect: "none",
            cursor: "default",
            fontStyle: "italic"
          }}>
            🤖 <strong>Don't worry!</strong> If no player joins within 10 seconds, our smart bot will be your opponent.
          </p>
        </div>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              joinGame();
            }
          }}
          style={{
            padding: "15px",
            fontSize: "16px",
            borderRadius: "20px",
            border: "none",
            marginBottom: "20px",
            width: "80%",
            textAlign: "center",
            backgroundColor: "#fff",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            outline: "none",
            userSelect: "text"
          }}
          disabled={joined}
          autoComplete="off"
          spellCheck="false"
        />
        {error && <p style={{ color: "#ff6b6b", marginBottom: "20px", fontSize: "16px" }}>{error}</p>}
        {connectionError && (
          <div style={{ 
            padding: "12px 15px", 
            backgroundColor: "#ffdddd", 
            borderRadius: "10px", 
            marginBottom: "20px",
            color: "#d8000c",
            fontSize: "14px",
            textAlign: "center",
            width: "80%",
            maxWidth: "400px"
          }}>
            <strong>Connection Error:</strong> Unable to reach the game server. Please check your internet connection and try again.
            <button
              onClick={() => window.location.reload()}
              style={{
                display: "block",
                margin: "10px auto 0",
                padding: "6px 12px",
                fontSize: "14px",
                backgroundColor: "#d8000c",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        )}
        <button
          onClick={joinGame}
          disabled={joined}
          style={{
            padding: "12px 30px",
            fontSize: "18px",
            backgroundColor: joined ? "#555" : "#6ee7b7",
            color: joined ? "#fff" : "#000",
            border: "none",
            borderRadius: "20px",
            cursor: joined ? "not-allowed" : "pointer",
            fontWeight: "bold",
            transition: "background 0.3s",
          }}
        >
          {joined ? "Waiting for opponent..." : "Play Now"}
        </button>
      </div>
    </div>
  );
};

export default Lobby;
