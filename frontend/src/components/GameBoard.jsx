import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { getSocket } from "../socket";
import { backendService } from "../services/backendService";

const ROWS = 6;
const COLS = 7;

const GameBoard = () => {
  const location = useLocation();
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // Get data from navigation state
  const { username, opponent, turn: initialTurn } = location.state || {};
  
  const [board, setBoard] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [turn, setTurn] = useState(initialTurn || null);
  const [winningPositions, setWinningPositions] = useState([]);
  const [lastMove, setLastMove] = useState(null); // Track the last move position
  const [connectionError, setConnectionError] = useState(false); // Track connection errors
  const [isReconnecting, setIsReconnecting] = useState(false); // Track reconnection status
  const [reconnectAttempts, setReconnectAttempts] = useState(0); // Track reconnection attempts
  
  // If no state data, redirect back to lobby
  useEffect(() => {
    console.log("🔍 GameBoard state check:", { username, gameId, opponent, initialTurn });
    console.log("🔍 Location state:", location.state);
    if (!username || !gameId) {
      console.log("❌ Missing required data, redirecting to lobby");
      navigate("/play");
      return;
    }
  }, [username, gameId, opponent, initialTurn, location.state, navigate]);

  const makeMove = async (col) => {
    if (turn !== username) return;
    
    try {
      const socket = await getSocket();
      socket.emit("makeMove", { gameId, column: col });
    } catch (error) {
      console.error("Failed to make move:", error);
      // Show connection error
      setConnectionError(true);
    }
  };

  useEffect(() => {
    const initializeGameSocket = async () => {
      console.log("🔁 GameBoard mounted. Username:", username, "Opponent:", opponent, "Turn:", turn);
      
      try {
        setConnectionError(false);
        const socket = await getSocket();

        // Set up socket connection error handler
        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setConnectionError(true);
        });

        socket.on("disconnect", (reason) => {
          console.error("Socket disconnected:", reason);
          if (reason === "io server disconnect" || reason === "transport error") {
            setConnectionError(true);
          }
        });

        socket.on("moveMade", ({ column, row, symbol, board }) => {
          // Connection is working if we receive this event
          setConnectionError(false);
          setBoard([...board]);
          
          // Track the last move position
          setLastMove({ row, column, symbol });

          // Switch turn locally
          setTurn(prev => (prev === username ? opponent : username));
        });

        socket.on("gameOver", ({ winner, draw, board, winningPositions }) => {
          // Connection is working if we receive this event
          setConnectionError(false);
          
          // Clear any existing winning positions first
          setWinningPositions([]);
          
          // Force update board with final state if provided
          if (board) {
            setBoard([...board]);
          }
          
          // Use setTimeout to ensure board state is updated before setting winning positions
          setTimeout(() => {
            // Set winning positions for highlighting
            if (winningPositions) {
              setWinningPositions(winningPositions);
            }
            
            // Simply show alert and navigate home - no overlay
            setTimeout(() => {
              if (draw) {
                alert("It's a Draw!");
              } else {
                alert(winner === username ? "You Win!" : `${winner} Wins`);
              }
              navigate("/");
            }, 2000); // Slightly shorter delay, as we're not showing the overlay anymore
          }, 100); // Small delay to ensure board renders before highlighting
        });

        socket.on("playerDisconnected", ({ message }) => {
          alert(message);
        });

        socket.on("playerRejoined", ({ message }) => {
          setConnectionError(false);
          alert(message);
        });
        
      } catch (error) {
        console.error("Failed to initialize game socket:", error);
        setConnectionError(true);
      }
    };

    initializeGameSocket();

    return () => {
      // Clean up socket listeners
      getSocket().then(socket => {
        socket.off("connect_error");
        socket.off("disconnect");
        socket.off("moveMade");
        socket.off("gameOver");
        socket.off("playerDisconnected");
        socket.off("playerRejoined");
      }).catch(console.error);
    };
  }, [username, opponent, turn, navigate]);

  // Effect for handling reconnection attempts - simplified and merged from two effects
  useEffect(() => {
    if (connectionError && !isReconnecting) {
      const MAX_RECONNECT_ATTEMPTS = 3;
      
      const attemptReconnect = async () => {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log("Maximum reconnection attempts reached");
          return;
        }
        
        setIsReconnecting(true);
        console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        try {
          // Try waking up backend again
          await backendService.wakeUpBackend();
          
          // Wait for backend to be ready
          const isReady = await backendService.waitForBackend(10, 3000);
          
          if (isReady) {
            console.log("Reconnection successful!");
            setConnectionError(false);
            
            // Reinitialize socket connection
            const socket = await getSocket();
            
            // Set up event listeners for the new socket
            socket.on("connect", () => {
              console.log("Reconnected to server.");
              setConnectionError(false);
              setReconnectAttempts(0);
            });
            
            if (socket.connected) {
              console.log("Socket reconnected successfully");
              setConnectionError(false);
              setReconnectAttempts(0);
            }
          } else {
            throw new Error("Backend failed to respond after reconnection attempt");
          }
        } catch (error) {
          console.error("Reconnection attempt failed:", error);
          setReconnectAttempts(prev => prev + 1);
          
          // Apply exponential backoff if we need to try again
          if (reconnectAttempts + 1 < MAX_RECONNECT_ATTEMPTS) {
            const backoffTime = Math.min(5000, 1000 * Math.pow(2, reconnectAttempts));
            console.log(`Will retry in ${backoffTime/1000}s...`);
            setTimeout(() => {
              setIsReconnecting(false); // Allow next attempt
            }, backoffTime);
            return; // Don't set isReconnecting to false yet
          }
        } finally {
          if (reconnectAttempts + 1 >= MAX_RECONNECT_ATTEMPTS) {
            setIsReconnecting(false);
          }
        }
      };
      
      attemptReconnect();
    }
  }, [connectionError, isReconnecting, reconnectAttempts]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 25px #00ff00, inset 0 0 15px #00ff00;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 40px #00ff00, inset 0 0 25px #00ff00;
            transform: scale(1.1);
          }
          100% {
            box-shadow: 0 0 25px #00ff00, inset 0 0 15px #00ff00;
            transform: scale(1);
          }
        }
        
        @keyframes winningGlow {
          0% {
            box-shadow: 0 0 30px #ffd700, inset 0 0 20px #ffd700;
            border-color: #ffd700;
          }
          25% {
            box-shadow: 0 0 40px #00ff00, inset 0 0 25px #00ff00;
            border-color: #00ff00;
          }
          50% {
            box-shadow: 0 0 50px #ff0080, inset 0 0 30px #ff0080;
            border-color: #ff0080;
          }
          75% {
            box-shadow: 0 0 40px #00ff00, inset 0 0 25px #00ff00;
            border-color: #00ff00;
          }
          100% {
            box-shadow: 0 0 30px #ffd700, inset 0 0 20px #ffd700;
            border-color: #ffd700;
          }
        }
        
        @keyframes lastMoveGlow {
          0% {
            box-shadow: 0 0 60px #ff6b6b, inset 0 0 30px #ff6b6b;
            border-color: #ff6b6b;
            transform: scale(1.3);
          }
          25% {
            box-shadow: 0 0 80px #ffd93d, inset 0 0 40px #ffd93d;
            border-color: #ffd93d;
            transform: scale(1.4);
          }
          50% {
            box-shadow: 0 0 100px #6bcf7f, inset 0 0 50px #6bcf7f;
            border-color: #6bcf7f;
            transform: scale(1.5);
          }
          75% {
            box-shadow: 0 0 80px #4ecdc4, inset 0 0 40px #4ecdc4;
            border-color: #4ecdc4;
            transform: scale(1.4);
          }
          100% {
            box-shadow: 0 0 60px #ff6b6b, inset 0 0 30px #ff6b6b;
            border-color: #ff6b6b;
            transform: scale(1.3);
          }
        }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0b1d1f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "50px 20px",
          color: "#fff",
        }}
      >
      <div
        style={{
          backgroundColor: "#122c2f",
          borderRadius: "20px",
          padding: "40px",
          maxWidth: "800px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "32px", color: "#fff", marginBottom: "10px" }}>Connect4</h2>
        <h3 style={{ fontSize: "20px", margin: "5px 0", color: "#6ee7b7" }}>
          Turn: <span style={{ color: "#fff" }}>{turn || "Loading..."}</span>
        </h3>
        <h4 style={{ fontSize: "18px", margin: "5px 0 30px 0", color: "#6ee7b7" }}>
          Opponent: <span style={{ color: "#fff" }}>{opponent || "Waiting..."}</span>
        </h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 60px)`,
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#0b1d1f",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            marginBottom: "30px"
          }}
        >
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isWinningPosition = winningPositions.some(pos => pos[0] === rIdx && pos[1] === cIdx);
              const isLastWinningMove = lastMove && 
                                       lastMove.row === rIdx && lastMove.column === cIdx && 
                                       isWinningPosition;
              
              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => makeMove(cIdx)}
                  style={{
                    width: "60px",
                    height: "60px",
                    backgroundColor:
                      isLastWinningMove
                        ? (cell === "X" ? "#ff1a1a" : "#ffaa00") // Super bright colors for the last winning move
                        : isWinningPosition 
                          ? (cell === "X" ? "#ff4444" : "#ffcc44") // Brighter colors for winning pieces
                          : (cell === "X" ? "#d62828" : cell === "O" ? "#fcbf49" : "#e0e0e0"),
                    border: isLastWinningMove 
                      ? "6px solid #ff6b6b" 
                      : isWinningPosition 
                        ? "5px solid #00ff00" 
                        : "2px solid #333",
                    borderRadius: "50%",
                    cursor: turn === username ? "pointer" : "not-allowed",
                    transition: "transform 0.2s, border 0.3s, box-shadow 0.3s, background-color 0.3s",
                    boxShadow: isLastWinningMove
                      ? "0 0 60px #ff6b6b, inset 0 0 30px #ff6b6b, 0 0 100px rgba(255, 107, 107, 0.5)"
                      : isWinningPosition 
                        ? "0 0 30px #00ff00, inset 0 0 15px #00ff00, 0 0 50px rgba(0, 255, 0, 0.3)" 
                        : "none",
                    animation: isLastWinningMove 
                      ? "lastMoveGlow 1s infinite" 
                      : isWinningPosition 
                        ? "winningGlow 1.5s infinite" 
                        : "none",
                    position: "relative",
                    zIndex: isLastWinningMove ? 20 : isWinningPosition ? 10 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (turn === username && !isWinningPosition) e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseOut={(e) => {
                    if (!isWinningPosition && !isLastWinningMove) e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {/* Add special icon for the last winning move */}
                  {isLastWinningMove && (
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "24px",
                      color: "#ffffff",
                      textShadow: "0 0 15px #000000",
                      fontWeight: "bold",
                      zIndex: 21,
                      animation: "pulse 0.8s infinite"
                    }}>
                      🏆
                    </div>
                  )}
                  {/* Add a star icon for other winning pieces */}
                  {isWinningPosition && !isLastWinningMove && (
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      fontSize: "20px",
                      color: "#ffffff",
                      textShadow: "0 0 10px #000000",
                      fontWeight: "bold",
                      zIndex: 11,
                      animation: "pulse 1s infinite"
                    }}>
                      ⭐
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Connection Error Message */}
        {connectionError && (
          <div style={{
            backgroundColor: "#ffdddd",
            color: "#d8000c",
            padding: "15px",
            borderRadius: "10px",
            marginBottom: "20px",
            border: "1px solid #d8000c",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            position: "relative",
            zIndex: 1000,
          }}>
            <strong>Error:</strong> Unable to connect to the game server. Please check your internet connection and try again.
            <div style={{
              marginTop: "10px",
              fontSize: "14px",
              color: "#333",
            }}>
              {isReconnecting 
                ? `Attempting to reconnect... (${reconnectAttempts})`
                : "Please refresh the page to try reconnecting."}
            </div>
          </div>
        )}
        
        <button 
          onClick={() => navigate("/play")}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#6ee7b7",
            color: "#000",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Back to Lobby
        </button>
      </div>
    </div>

    {/* Connection Error Modal */}
    {connectionError && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(11, 29, 31, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        color: '#fff'
      }}>
        <div style={{
          backgroundColor: '#122c2f',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 0 30px rgba(255, 0, 0, 0.3)',
          border: '2px solid #ff5252'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: '#ff5252',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 20px auto',
            fontSize: '40px'
          }}>
            ⚠️
          </div>
          
          <h2 style={{
            fontSize: '28px',
            marginBottom: '15px',
            color: '#ff5252'
          }}>
            Server Connection Error
          </h2>
          
          <p style={{
            fontSize: '16px',
            marginBottom: '20px',
            color: '#fff',
            lineHeight: '1.6'
          }}>
            We're having trouble connecting to the game server. This could be because:
          </p>

          <ul style={{
            textAlign: 'left',
            marginBottom: '25px',
            color: '#e0e0e0',
            paddingLeft: '20px'
          }}>
            <li style={{ marginBottom: '8px' }}>The server is temporarily down or restarting</li>
            <li style={{ marginBottom: '8px' }}>The free tier server has gone to sleep due to inactivity</li>
            <li style={{ marginBottom: '8px' }}>Your internet connection is unstable</li>
          </ul>
          
          <p style={{
            fontSize: '16px',
            marginBottom: '25px',
            color: '#fff'
          }}>
            {isReconnecting ? 
              `Attempting to reconnect... (Attempt ${reconnectAttempts + 1})` : 
              reconnectAttempts >= 3 ? 
                'Maximum reconnection attempts reached.' : 
                'Please wait while we try to reconnect.'}
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <button 
              onClick={() => navigate("/")}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#ff5252',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: isReconnecting ? 0.7 : 1,
                transition: 'all 0.3s ease'
              }}
              disabled={isReconnecting}
            >
              Return Home
            </button>
            
            <button 
              onClick={() => {
                setReconnectAttempts(0);
                setConnectionError(true);
              }}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#6ee7b7',
                color: '#122c2f',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: isReconnecting ? 0.7 : 1,
                transition: 'all 0.3s ease'
              }}
              disabled={isReconnecting}
            >
              Try Again
            </button>
          </div>

          {isReconnecting && (
            <div style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'center',
              gap: '8px'
            }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#6ee7b7',
                    borderRadius: '50%',
                    animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default GameBoard;
