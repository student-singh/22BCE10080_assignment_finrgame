require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const leaderboardRoutes = require("./routes/leaderboard");
const { connectProducer } = require("./kafka/producer");
const { apiLimiter, healthLimiter } = require("./utils/rateLimiter");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  },
});

const PORT = process.env.PORT || 5000;

const { socketConnectionLimiter, socketEventLimiter } = require('./utils/socketRateLimiter');

// ✅ Main startup
const startServer = async () => {
  await connectProducer(); // 🧠 Important: Wait for Kafka to be ready

  // Configure CORS with simplified options
  app.use(cors());
  
  // Enable parsing JSON and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Apply rate limiting to API routes
  app.use("/leaderboard", apiLimiter, leaderboardRoutes);

  // Configure Socket.io rate limiting
  io.use(socketConnectionLimiter);
  io.on('connection', socketEventLimiter);
  
  // Load game controller after rate limiting is set up
  require("./controllers/gameController")(io); // 🎮 Load game logic after Kafka

  // Base route with rate limiting
  app.get("/", apiLimiter, (req, res) => {
    res.send("Connect 4 API running");
  });

  // Health check endpoint with more permissive rate limit
  app.get("/health", healthLimiter, (req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      rateLimit: {
        remaining: res.getHeader('X-RateLimit-Remaining') || res.getHeader('RateLimit-Remaining'),
        limit: res.getHeader('X-RateLimit-Limit') || res.getHeader('RateLimit-Limit'),
      }
    });
  });

  // Wake up endpoint with more permissive rate limit
  app.get("/wake", healthLimiter, (req, res) => {
    console.log("🚀 Wake up request received");
    res.status(200).json({ 
      message: "Server is awake", 
      timestamp: new Date().toISOString(),
      rateLimit: {
        remaining: res.getHeader('X-RateLimit-Remaining') || res.getHeader('RateLimit-Remaining'),
        limit: res.getHeader('X-RateLimit-Limit') || res.getHeader('RateLimit-Limit'),
      }
    });
  });
  
  // Import and use error handling middleware
  const { errorHandler, notFoundHandler, requestLogger } = require('./utils/errorHandler');
  
  // Add request logging in development mode
  if (process.env.NODE_ENV !== 'production') {
    app.use(requestLogger);
  }
  
  // 404 handler for undefined routes - must come after all defined routes
  app.use(notFoundHandler);
  
  // Global error handler - must be the last middleware
  app.use(errorHandler);

  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer() // 🚀 Start the app
  .catch(err => {
    console.error('⚠️ Failed to start server:', err);
    process.exit(1);
  });
