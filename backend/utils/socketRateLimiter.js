/**
 * Socket.io rate limiting middleware
 * Limits the number of socket connections and events per client
 */

// Maps to track client connections and events
const connectionLimiter = new Map();
const eventLimiter = new Map();

// Configuration
const SOCKET_LIMIT_CONFIG = {
  connections: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 connections per minute per IP
  },
  events: {
    windowMs: 10 * 1000, // 10 seconds
    max: 50, // 50 events per 10 seconds per socket
    // Event-specific limits
    byType: {
      // Game moves should be more limited to prevent spam
      'make_move': {
        windowMs: 5 * 1000, // 5 seconds
        max: 10, // 10 move events per 5 seconds
      },
      // Chat messages should be rate limited to prevent spam
      'send_message': {
        windowMs: 5 * 1000, // 5 seconds
        max: 5, // 5 messages per 5 seconds
      },
      // Default for all other events
      'default': {
        windowMs: 10 * 1000, 
        max: 50
      }
    }
  }
};

/**
 * Socket connection rate limiting middleware
 * Limits number of new connections per IP address
 */
const socketConnectionLimiter = (socket, next) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  
  if (!connectionLimiter.has(clientIp)) {
    connectionLimiter.set(clientIp, {
      connections: 1,
      timestamp: Date.now()
    });
    return next();
  }
  
  const clientData = connectionLimiter.get(clientIp);
  const currentTime = Date.now();
  
  // Reset counter after window expires
  if (currentTime - clientData.timestamp > SOCKET_LIMIT_CONFIG.connections.windowMs) {
    connectionLimiter.set(clientIp, {
      connections: 1,
      timestamp: currentTime
    });
    return next();
  }
  
  // Check if limit is exceeded
  if (clientData.connections >= SOCKET_LIMIT_CONFIG.connections.max) {
    console.log(`⚠️ Socket connection rate limit exceeded for ${clientIp}`);
    const err = new Error('Too many connection attempts, please try again later');
    err.data = { 
      code: 429,
      error: 'RATE_LIMITED',
      retryAfter: Math.ceil(SOCKET_LIMIT_CONFIG.connections.windowMs / 1000),
      timestamp: new Date().toISOString(),
      message: 'Too many connection attempts, please try again later',
      source: 'socket-connection'
    };
    return next(err);
  }
  
  // Increment connection counter
  clientData.connections++;
  connectionLimiter.set(clientIp, clientData);
  next();
};

/**
 * Socket event rate limiting middleware
 * Limits number of events per socket connection
 */
const socketEventLimiter = (socket) => {
  const socketId = socket.id;
  
  // Initialize event tracker for this socket
  eventLimiter.set(socketId, {
    events: {
      total: 0,
      byType: {}
    },
    timestamp: Date.now(),
    isLimited: false,
    typeTimestamps: {}
  });
  
  // Check event rate before processing each event
  socket.onAny((event, ...args) => {
    // Skip internal events
    if (event.startsWith('connect') || event.startsWith('disconnect')) {
      return;
    }
    
    const eventData = eventLimiter.get(socketId);
    if (!eventData) return; // Socket not being tracked
    
    const currentTime = Date.now();
    
    // Get event-specific limits if they exist, otherwise use defaults
    const eventTypeConfig = SOCKET_LIMIT_CONFIG.events.byType[event] || 
                           SOCKET_LIMIT_CONFIG.events.byType.default;
    const windowMs = eventTypeConfig.windowMs;
    const maxEvents = eventTypeConfig.max;
    
    // Initialize event type counter if needed
    if (!eventData.events.byType[event]) {
      eventData.events.byType[event] = 0;
      eventData.typeTimestamps[event] = currentTime;
    }
    
    // Reset counter for this event type if window expired
    if (currentTime - eventData.typeTimestamps[event] > windowMs) {
      eventData.events.byType[event] = 1;
      eventData.typeTimestamps[event] = currentTime;
      // Update tracker
      eventLimiter.set(socketId, eventData);
      return;
    }
    
    // Reset global counter if window expired
    if (currentTime - eventData.timestamp > SOCKET_LIMIT_CONFIG.events.windowMs) {
      eventData.events.total = 1;
      eventData.timestamp = currentTime;
      eventData.isLimited = false;
      // Keep event type counters
      eventLimiter.set(socketId, eventData);
      return;
    }
    
    // Check if event-specific limit is exceeded
    if (eventData.events.byType[event] >= maxEvents) {
      if (!eventData.isLimited) {
        console.log(`⚠️ Socket event rate limit exceeded for socket ${socketId} on event "${event}"`);
        // Emit rate limit event that the frontend is listening for
        socket.emit('rate_limit_exceeded', { 
          code: 429, 
          error: 'RATE_LIMITED',
          message: `Too many "${event}" events, please slow down`,
          retryAfter: Math.ceil(windowMs / 1000),
          timestamp: new Date().toISOString(),
          isRateLimited: true,
          source: 'socket-events',
          eventType: event,
          limit: maxEvents,
          windowSeconds: windowMs / 1000
        });
        
        // Mark as limited to avoid spamming error messages
        eventData.isLimited = true;
        eventLimiter.set(socketId, eventData);
      }
      
      // Drop the event
      return false;
    }
    
    // Increment event counters
    eventData.events.total++;
    eventData.events.byType[event]++;
    eventLimiter.set(socketId, eventData);
  });
  
  // Clean up on disconnect
  socket.on('disconnect', () => {
    eventLimiter.delete(socketId);
  });
};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean up connection limiter
  for (const [ip, data] of connectionLimiter.entries()) {
    if (now - data.timestamp > SOCKET_LIMIT_CONFIG.connections.windowMs * 2) {
      connectionLimiter.delete(ip);
    }
  }
  
  // Clean up event limiter
  for (const [socketId, data] of eventLimiter.entries()) {
    if (now - data.timestamp > SOCKET_LIMIT_CONFIG.events.windowMs * 2) {
      eventLimiter.delete(socketId);
    }
  }
}, 60000); // Run cleanup every minute

module.exports = {
  socketConnectionLimiter,
  socketEventLimiter
};
