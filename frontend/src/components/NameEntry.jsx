import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../socket";
import useRateLimiting from "../hooks/useRateLimiting";

const NameEntry = () => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const { isRateLimited, remainingTime, isExcessiveRateLimits } = useRateLimiting();
  const navigate = useNavigate();

  const joinGame = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    
    // Don't attempt to join if rate limited
    if (isRateLimited) {
      setError(`Server is rate limited. Please wait ${remainingTime} seconds before trying again.`);
      return;
    }
    
    try {
      setIsJoining(true);
      setError("");
      setConnectionError(false);
      
      const socket = await getSocket();
      socket.emit("joinGame", trimmed);
      
      // Fallback: auto-play with bot if no player joins in 5 seconds
      const botTimeout = setTimeout(async () => {
        if (isJoining) {
          try {
            const socket = await getSocket();
            socket.emit("startBotGame", trimmed);
          } catch (error) {
            console.error("Failed to start bot game:", error);
            
            // Check if error is rate limiting related
            if (error.message && (
                error.message.includes('429') || 
                error.message.includes('Too Many Requests') ||
                error.message.toLowerCase().includes('rate limit')
            )) {
              setError(`Too Many Requests (429). Server is rate limited. Please try again later.`);
            } else {
              setConnectionError(true);
            }
            
            setIsJoining(false);
          }
        }
      }, 5000);
      
      return () => clearTimeout(botTimeout);
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
      
      setIsJoining(false);
    }
  };

  useEffect(() => {
    let socketInstance = null;
    
    const setupSocket = async () => {
      try {
        socketInstance = await getSocket();
        
        const handleGameStarted = ({ gameId }) => {
          navigate(`/game/${gameId}`, { state: { username: name } });
        };
        
        socketInstance.on("gameStarted", handleGameStarted);
        
        return () => {
          if (socketInstance) {
            socketInstance.off("gameStarted", handleGameStarted);
          }
        };
      } catch (error) {
        console.error("Failed to setup socket in NameEntry:", error);
        setConnectionError(true);
      }
    };
    
    const cleanup = setupSocket();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn()).catch(console.error);
    };
  }, [name, navigate]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0b1d1f",
        padding: "20px",
      }}
    >
      <h2
        style={{
          fontSize: "32px",
          color: "#ffffff",
          marginBottom: "20px",
          fontWeight: "600",
        }}
      >
        Enter Your Name
      </h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your Name"
        style={{
          padding: "12px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "15px",
          width: "250px",
          textAlign: "center",
        }}
      />
      {error && <p style={{ color: "#ff6b6b", marginBottom: "10px" }}>{error}</p>}
      
      {/* Show rate limiting error */}
      {isRateLimited && (
        <div style={{ 
          padding: "10px 15px", 
          backgroundColor: isExcessiveRateLimits ? "#ffcccc" : "#fff3cd",
          borderRadius: "5px", 
          marginBottom: "15px",
          color: isExcessiveRateLimits ? "#d8000c" : "#856404",
          fontSize: "14px",
          textAlign: "center",
          maxWidth: "300px",
          border: `1px solid ${isExcessiveRateLimits ? "#f5c6cb" : "#ffeeba"}`
        }}>
          <strong>{isExcessiveRateLimits ? "Too Many Requests (429):" : "Rate Limited:"}</strong> 
          {isExcessiveRateLimits 
            ? ` The server is receiving too many requests. Please wait ${remainingTime} seconds.` 
            : ` Please wait ${remainingTime} seconds before trying again.`}
            
          {/* Progress bar for rate limit countdown */}
          <div style={{ 
            height: "4px", 
            backgroundColor: "rgba(0, 0, 0, 0.1)", 
            marginTop: "8px",
            borderRadius: "2px",
            overflow: "hidden"
          }}>
            <div style={{ 
              height: "100%", 
              backgroundColor: isExcessiveRateLimits ? "#d8000c" : "#856404",
              width: `${remainingTime > 0 ? (remainingTime / 60) * 100 : 100}%`,
              transition: "width 1s linear"
            }}></div>
          </div>
        </div>
      )}
      
      {connectionError && !isRateLimited && (
        <div style={{ 
          padding: "10px 15px", 
          backgroundColor: "#ffdddd", 
          borderRadius: "5px", 
          marginBottom: "15px",
          color: "#d8000c",
          fontSize: "14px",
          textAlign: "center",
          maxWidth: "300px"
        }}>
          <strong>Connection Error:</strong> Unable to reach the game server. Please check your connection and try again.
        </div>
      )}
      <button
        onClick={joinGame}
        disabled={isJoining || isRateLimited}
        style={{
          padding: "12px 25px",
          fontSize: "16px",
          backgroundColor: 
            isJoining ? "#6c757d" : 
            isRateLimited ? "#ffc107" :
            connectionError ? "#ff6b6b" : 
            "#6ee7b7",
          color: "#0b1d1f",
          border: "none",
          borderRadius: "8px",
          cursor: (isJoining || isRateLimited) ? "not-allowed" : "pointer",
          transition: "background-color 0.3s",
          opacity: isRateLimited ? 0.7 : 1
        }}
      >
        {isJoining ? "Joining..." : 
          isRateLimited ? `Rate Limited (${remainingTime}s)` : 
          connectionError ? "Retry Connection" : 
          "Join Game"}
      </button>
      {connectionError && (
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "10px",
            padding: "8px 15px",
            fontSize: "14px",
            backgroundColor: "transparent",
            color: "#6ee7b7",
            border: "1px solid #6ee7b7",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Reload Page
        </button>
      )}
    </div>
  );
};

export default NameEntry;
