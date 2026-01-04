// src/App.jsx

import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./components/Landing";
import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";
import BackendLoader from "./components/BackendLoader";
import RateLimitNotification from "./components/RateLimitNotification";
import CorsErrorNotification from "./components/CorsErrorNotification";
import { getSocket } from "./socket";

function App() {
  const [isBackendLoading, setIsBackendLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const initializeBackend = async () => {
      try {
        console.log("🚀 Initializing backend connection...");
        setIsBackendLoading(true);
        
        // Listen for CORS errors
        const handleCorsError = (event) => {
          const { isCorsError } = event.detail;
          if (isCorsError) {
            console.log("CORS error detected in App component");
            // Don't show the full-page error for CORS issues
            // We'll show a notification instead via CorsErrorNotification
            setIsBackendLoading(false);
          }
        };
        window.addEventListener('backendConnectionError', handleCorsError);
        
        // Wait for socket to be ready
        try {
          await getSocket();
          console.log("✅ Backend connection established");
          setIsBackendLoading(false);
          setConnectionError(null);
        } catch (error) {
          console.error("❌ Failed to connect to backend:", error);
          
          // Check if it's a CORS error
          if (error.message && (
              error.message.includes('CORS') || 
              error.message.includes('Failed to fetch')
          )) {
            // Let the app continue with the CORS notification
            setIsBackendLoading(false);
          } else {
            // For other errors, show the full-page error
            setConnectionError(error.message);
            setIsBackendLoading(false);
          }
        }
        
        return () => {
          window.removeEventListener('backendConnectionError', handleCorsError);
        };
      } catch (error) {
        console.error("❌ Failed to connect to backend:", error);
        setConnectionError(error.message);
        setIsBackendLoading(false);
      }
    };

    initializeBackend();
  }, []);

  // Show error state if connection failed
  if (connectionError && !isBackendLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0b1d1f',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff'
      }}>
        <div style={{
          backgroundColor: '#122c2f',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%'
        }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>
            🚫 Connection Failed
          </h2>
          <p style={{ marginBottom: '20px' }}>
            Unable to connect to the game server. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#6ee7b7',
              color: '#000',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackendLoader 
        isLoading={isBackendLoading} 
        message="Connecting to game server..."
      />
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/play" element={<Lobby />} />
          <Route path="/game/:gameId" element={<GameBoard />} />
        </Routes>
        
        {/* Show notifications for any route */}
        <RateLimitNotification />
        <CorsErrorNotification />
      </BrowserRouter>
    </>
  );
}

export default App;
