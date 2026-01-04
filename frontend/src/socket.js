// src/socket.js

import { io } from "socket.io-client";
import { backendService } from "./services/backendService";

const BACKEND_URL = "https://connect4-backend-ka4c.onrender.com";

// Initialize socket connection with backend wake-up
let socket = null;
let isConnecting = false;
let connectionPromise = null;

const createSocketConnection = () => {
  console.log("🔌 Creating socket connection...");
  return io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
    autoConnect: true,
    forceNew: false,
  });
};

const connectWithWakeup = async () => {
  if (socket?.connected) {
    console.log("✅ Socket already connected");
    return socket;
  }

  if (isConnecting && connectionPromise) {
    console.log("⏳ Connection already in progress, waiting...");
    return await connectionPromise;
  }

  // Enhanced rate limit checking before attempting connection
  if (backendService.handleRateLimiting?.checkIfRateLimited()) {
    const remainingSeconds = backendService.handleRateLimiting.getRemainingTime();
    console.log(`⚠️ Rate limited. Waiting ${remainingSeconds}s before trying to connect.`);
    
    // Dispatch a custom event to notify UI components about the rate limiting
    const event = new CustomEvent('backendRateLimited', {
      detail: {
        isRateLimited: true,
        retryAfterSeconds: remainingSeconds,
        reason: 'Too Many Requests (429)',
        source: 'socket-connection'
      }
    });
    window.dispatchEvent(event);
    
    throw new Error(`429 Too Many Requests. Please wait ${remainingSeconds} seconds before trying to connect.`);
  }

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      // First, wake up the backend
      console.log("🚀 Starting backend connection process...");
      await backendService.wakeUpBackend();
      
      // Wait for backend to be ready
      const isReady = await backendService.waitForBackend();
      
      if (!isReady) {
        throw new Error("Backend failed to wake up after multiple attempts");
      }

      // Create socket connection if not exists
      if (!socket) {
        socket = createSocketConnection();
      } else if (!socket.connected) {
        socket.connect();
      }

      // Wait for socket to connect
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Socket connection timeout after 30 seconds"));
        }, 30000); // 30 second timeout

        const onConnect = () => {
          console.log("✅ Socket connected successfully!");
          clearTimeout(timeout);
          socket.off('connect', onConnect);
          socket.off('connect_error', onConnectError);
          resolve(socket);
        };

        const onConnectError = (error) => {
          console.log("❌ Socket connection error:", error);
          clearTimeout(timeout);
          socket.off('connect', onConnect);
          socket.off('connect_error', onConnectError);
          
          // Check if the error is related to rate limiting (429)
          if (error.message && (
              error.message.includes('429') || 
              error.message.includes('Too Many Requests') ||
              error.message.toLowerCase().includes('rate limit')
          )) {
            // Set rate limiting in the backend service
            const retrySeconds = 60; // Default retry after 60 seconds if not specified
            backendService.handleRateLimiting.setRateLimited(true, retrySeconds);
            
            reject(new Error(`429 Too Many Requests. Socket connection blocked by rate limiting. Please wait ${retrySeconds} seconds.`));
          } else {
            reject(error);
          }
        };

        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);

        // If socket is already connected
        if (socket.connected) {
          console.log("✅ Socket was already connected");
          clearTimeout(timeout);
          resolve(socket);
        }
      });

    } catch (error) {
      console.error("❌ Failed to establish connection:", error);
      
      // Check if the error is related to CORS
      if (error.message && (
          error.message.includes('CORS') ||
          error.message.includes('Access-Control-Allow-Origin') ||
          error.message.includes('net::ERR_FAILED')
      )) {
        console.error("CORS error detected. This usually means the backend isn't properly configured for cross-origin requests.");
        
        // Dispatch a custom event for UI components to display CORS-specific error
        const event = new CustomEvent('backendConnectionError', {
          detail: {
            error: 'CORS_ERROR',
            message: 'Unable to connect to the server due to CORS restrictions. This usually happens when the server is unavailable or not configured to accept requests from your browser.',
            statusCode: 0, // CORS errors don't typically have HTTP status codes
            isCorsError: true
          }
        });
        window.dispatchEvent(event);
      }
      // Check if the error is related to rate limiting or 429 Too Many Requests
      else if (error.message && (
          error.message.includes('429') || 
          error.message.includes('Too Many Requests') ||
          error.message.toLowerCase().includes('rate limit')
      )) {
        // If it's not already marked as rate limited, set it
        if (!backendService.handleRateLimiting.isRateLimited) {
          const retrySeconds = 60; // Default retry after 60 seconds
          backendService.handleRateLimiting.setRateLimited(true, retrySeconds);
        }
      }
      
      throw error;
    } finally {
      isConnecting = false;
      connectionPromise = null;
    }
  })();

  return await connectionPromise;
};

// Export socket connection function
export const getSocket = () => {
  if (socket?.connected) {
    return Promise.resolve(socket);
  }
  return connectWithWakeup();
};

// Initialize connection immediately but don't block
connectWithWakeup().catch(error => {
  console.error("❌ Initial connection failed:", error);
});

// Export socket instance for legacy compatibility, but use the main managed socket
export default socket;
