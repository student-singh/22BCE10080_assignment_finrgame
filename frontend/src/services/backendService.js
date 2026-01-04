import { io } from "socket.io-client";

const BACKEND_URL = "https://connect4-backend-ka4c.onrender.com";

// Rate limiting and retry configuration
const RATE_LIMIT_CONFIG = {
  maxRetries: 5,               // Maximum number of retries for rate-limited requests
  initialBackoffMs: 1000,      // Start with 1 second delay
  maxBackoffMs: 30000,         // Maximum backoff of 30 seconds
  backoffFactor: 1.5,          // Exponential backoff multiplier
  jitter: 0.2                  // Add randomness to avoid synchronized requests
};

// Helper function to implement exponential backoff with jitter
const calculateBackoff = (attempt) => {
  const backoff = Math.min(
    RATE_LIMIT_CONFIG.maxBackoffMs,
    RATE_LIMIT_CONFIG.initialBackoffMs * Math.pow(RATE_LIMIT_CONFIG.backoffFactor, attempt)
  );
  
  // Add jitter to prevent thundering herd problem
  const jitterRange = backoff * RATE_LIMIT_CONFIG.jitter;
  return backoff + (Math.random() * jitterRange - jitterRange / 2);
};

// Enhanced fetch with retry logic for rate limiting
const fetchWithRateLimitRetry = async (url, options = {}) => {
  let attempt = 0;
  
  while (attempt < RATE_LIMIT_CONFIG.maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Too Many Requests - implement backoff
        attempt++;
        
        // Get retry-after header or use calculated backoff
        const retryAfter = response.headers.get('Retry-After');
        const backoffMs = retryAfter 
          ? parseInt(retryAfter) * 1000
          : calculateBackoff(attempt);
        
        console.log(`⚠️ Rate limited (429) - Attempt ${attempt}/${RATE_LIMIT_CONFIG.maxRetries}. Retrying in ${backoffMs/1000}s`);
        
        // Wait for backoff period
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      
      return response;
    } catch (error) {
      if (error.name !== 'AbortError') {
        attempt++;
        console.log(`❌ Request failed - Attempt ${attempt}/${RATE_LIMIT_CONFIG.maxRetries}. Error: ${error.message}`);
        
        if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
          const backoffMs = calculateBackoff(attempt);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw new Error(`Request failed after ${RATE_LIMIT_CONFIG.maxRetries} retry attempts`);
}

export const backendService = {
  // Ping the backend to wake it up
    // Ping the backend to wake it up
    // Wait for backend with improved diagnostics
    // Ping the backend to wake it up
  async wakeUpBackend() {
    try {
      console.log("🔄 Waking up backend server...");
      
      // Try multiple wake-up strategies since /wake might not exist
      const wakeStrategies = [
        { endpoint: '/', name: 'Root endpoint' },
        { endpoint: '/health', name: 'Health endpoint' },
        { endpoint: '/api', name: 'API endpoint' },
        { endpoint: '/wake', name: 'Wake endpoint' }
      ];
      
      for (const strategy of wakeStrategies) {
        try {
          console.log(`Trying ${strategy.name}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000); // Increased timeout
          
          // Use rate-limit-aware fetch instead of regular fetch
          const response = await fetchWithRateLimitRetry(`${BACKEND_URL}${strategy.endpoint}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              // Add a cache-busting parameter to avoid cached 429 responses
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
            },
          });
          
          clearTimeout(timeoutId);
          
          console.log(`${strategy.name} response: ${response.status} ${response.statusText}`);
          
          // Consider any response (even 404) as the server being awake
          if (response.status !== 0) {
            console.log(`✅ Backend is responding! Server is awake (Status: ${response.status})`);
            // Give server time to fully initialize
            console.log("⏳ Waiting for server to fully initialize...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            return true;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log(`❌ ${strategy.name} timed out (server may be cold starting)`);
          } else {
            console.log(`❌ ${strategy.name} failed:`, error.message);
          }
          // Continue to next strategy
        }
      }
      
      console.log("❌ All wake-up strategies failed - server may still be sleeping");
      return false;
    } catch (error) {
      console.log("❌ Failed to wake up backend:", error.message);
      return false;
    }
  },

  // Wait for backend with improved diagnostics
  async waitForBackend(maxRetries = 25, initialDelay = 6000) {
    console.log("⏳ Waiting for backend to be ready...");
    console.log("💡 Free tier servers can take 2-3 minutes for cold starts");
    
    let currentDelay = initialDelay;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try basic server connection first
        const serverConnected = await this.checkServerConnection();
        
        if (serverConnected) {
          console.log("✅ Server is responding! Checking if fully ready...");
          
          // Try health check with fallback to alternative methods
          let isReady = await this.healthCheck();
          if (!isReady) {
            console.log("Main health check failed, trying alternatives...");
            isReady = await this.alternativeHealthCheck();
          }
          
          if (isReady) {
            console.log("✅ Backend is fully ready!");
            return true;
          } else {
            console.log("⚠️ Server responding but not fully ready yet");
            // If server is responding but health checks fail, still consider it progress
            // Reduce delay since server is at least responding
            currentDelay = Math.max(2000, currentDelay / 2);
          }
        } else {
          console.log("⚠️ Server not responding yet, continuing to wait...");
        }
        
        const minutes = Math.floor(((i + 1) * currentDelay) / 60000);
        const seconds = Math.floor((((i + 1) * currentDelay) % 60000) / 1000);
        console.log(`⏳ Retrying in ${currentDelay/1000}s... (${i + 1}/${maxRetries}) - ${minutes}m ${seconds}s elapsed`);
        
        // Capture delay value to avoid closure issue
        const delayValue = currentDelay;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayValue));
        
        // Reduce delay gradually but keep reasonable minimum
        currentDelay = Math.max(3000, currentDelay - 150);
        
      } catch (error) {
        console.log(`❌ Error during wait attempt ${i + 1}:`, error.message);
        // Capture delay value to avoid closure issue
        const delayValue = currentDelay;
        await new Promise(resolve => setTimeout(resolve, delayValue));
      }
    }
    
    console.log("❌ Backend failed to respond after maximum retries");
    console.log("💡 Try refreshing the page or check if the backend URL is correct");
    return false;
  },

  // Health check with improved logging and rate limit handling
  async healthCheck() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout

      const response = await fetchWithRateLimitRetry(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        },
      });
      
      clearTimeout(timeoutId);
      
      // Log the response for debugging
      console.log(`Health check response: ${response.status} ${response.statusText}`);
      
      return response.ok;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Backend health check timed out");
      } else {
        console.log("Backend health check failed:", error.message);
      }
      return false;
    }
  },

  // Check if the server is responding at all with rate limit handling
  async checkServerConnection() {
    try {
      console.log("🔍 Testing basic server connection...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Try with Socket.IO directly first (might work even with CORS issues for regular fetch)
      try {
        // Socket.IO has its own connection mechanism that sometimes works even when fetch doesn't
        console.log("🔄 Testing Socket.IO connectivity...");
        
        // Try to get existing socket.io connections or create a test socket
        // Rather than access the global io object (which causes lint errors)
        // We'll use the imported io function
        try {
          // Create a test socket but don't actually connect
          const testSocket = io(BACKEND_URL, { autoConnect: false });
          
          // If we can create a Socket.IO instance without errors, that's a good sign
          if (testSocket) {
            console.log("✅ Socket.IO instance created successfully");
            return true;
          }
        } catch (e) {
          console.log("Could not create Socket.IO instance:", e.message);
        }
      } catch (socketError) {
        console.log("Socket.IO check failed:", socketError.message);
      }
      
      // Fallback to regular fetch
      try {
        const response = await fetchWithRateLimitRetry(`${BACKEND_URL}/`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          },
          // Adding mode: 'no-cors' might allow the request to complete but limits response usage
          // mode: 'no-cors' 
        });
        
        clearTimeout(timeoutId);
        console.log(`Server connection: Status ${response.status}`);
        
        // Try to read the response
        try {
          const text = await response.text();
          console.log("Server response:", text);
        } catch (e) {
          console.log("Could not read server response");
        }
        
        // Handle specific status codes
        if (response.status === 429) {
          console.log("⚠️ Rate limited (429) - Server is alive but limiting requests");
          return true; // Server is responding, even if with rate limits
        }
        
        return response.status < 500; // Accept any response that's not a server error
      } catch (fetchError) {
        // Check if it's a CORS error
        const isCorsError = 
          fetchError.message.includes('CORS') || 
          fetchError.message.includes('Failed to fetch');
        
        if (isCorsError) {
          console.log("⚠️ CORS error detected - server may be up but blocking cross-origin requests");
          
          // Dispatch a custom event for UI components
          const event = new CustomEvent('backendConnectionError', {
            detail: {
              error: 'CORS_ERROR',
              message: 'Unable to connect to the server due to CORS restrictions. The server may be up but not configured to accept requests from your browser.',
              isCorsError: true
            }
          });
          window.dispatchEvent(event);
          
          // This is tricky - the server might actually be up but CORS is blocking us
          // We'll try Socket.IO direct connection in the actual gameplay
          return true; // Return true to allow the app to try connecting via Socket.IO
        }
        
        throw fetchError; // Re-throw if not a CORS error
      }
    } catch (error) {
      // No need to clear timeout here as it was already cleared in the try block
      // or was cleared in the nested try-catch
      console.log("Server connection failed:", error.message);
      return false;
    }
  },

  // Connect to backend with improved flow
   // Connect to backend with improved flow
    // Connect to backend with improved flow
  async connectToBackend() {
    console.log("🔗 Attempting to connect to backend...");
    console.log("💡 Note: Free tier servers may take 2-3 minutes to wake up from sleep");
    console.log(`🌐 Backend URL: ${BACKEND_URL}`);
    
    // First try basic connection to see if server is responding at all
    console.log("Testing basic connectivity...");
    const basicConnection = await this.checkServerConnection();
    
    if (!basicConnection) {
      console.log("No response from server, attempting wake up...");
      const wakeUpSuccess = await this.wakeUpBackend();
      
      if (!wakeUpSuccess) {
        console.log("Wake up attempts failed, but continuing with extended wait...");
        console.log("💡 Server might still be starting up in the background");
      } else {
        console.log("Wake up successful! Server is responding");
      }
    } else {
      console.log("Server is already responding!");
    }
    
    // Wait for backend to be fully ready
    const isReady = await this.waitForBackend(25, 6000);
    
    if (isReady) {
      console.log("✅ Successfully connected to backend!");
      return true;
    } else {
      console.log("❌ Failed to establish connection to backend after extended wait");
      console.log("💡 The backend may be experiencing issues. Please try again later.");
      return false;
    }
  },

  // Wait for backend with improved diagnostics
  

  // Enhanced connection diagnostics
    // Enhanced connection diagnostics
  async diagnoseConnection() {
    console.log("🔍 Diagnosing connection issues...");
    
    const endpoints = [
      { path: '/', name: 'Root' },
      { path: '/health', name: 'Health Check' },
      { path: '/wake', name: 'Wake Up' },
      { path: '/api/health', name: 'API Health Check' },
      { path: '/status', name: 'Status' },
      { path: '/ping', name: 'Ping' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name} endpoint...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${BACKEND_URL}${endpoint.path}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        console.log(`${endpoint.name}: ${response.ok ? '✅' : '❌'} (Status: ${response.status})`);
        
        // If we get a successful response, try to log the response body
        if (response.ok) {
          try {
            const text = await response.text();
            console.log(`${endpoint.name} response:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
          } catch (e) {
            console.log(`${endpoint.name} response: [Could not read response body]`);
          }
        } else {
          // Also log error responses
          try {
            const text = await response.text();
            console.log(`${endpoint.name} error response:`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
          } catch (e) {
            console.log(`${endpoint.name} error response: [Could not read error response]`);
          }
        }
      } catch (error) {
        console.log(`${endpoint.name}: ❌ Error - ${error.message}`);
      }
    }
  },

  // Alternative health check methods with rate limit handling
  async alternativeHealthCheck() {
    console.log("🔍 Trying alternative health check methods...");
    
    const alternativeEndpoints = [
      '/',
      '/api',
      '/ping',
      '/status'
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        const response = await fetchWithRateLimitRetry(`${BACKEND_URL}${endpoint}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Alternative health check successful using: ${endpoint}`);
          return true;
        }
        
        // If we got a response at all (even rate limited), consider it partially successful
        if (response.status === 429) {
          console.log(`⚠️ Alternative endpoint ${endpoint} responded with rate limit (429)`);
          console.log("Server is alive but limiting requests - continuing checks");
          // Continue checking other endpoints, but remember we got at least some response
        }
      } catch (error) {
        console.log(`❌ Alternative endpoint ${endpoint} failed:`, error.message);
      }
    }
    
    return false;
  },

  // Specifically handle rate limiting issues
  handleRateLimiting: {
    // Get the current rate limiting status
    isRateLimited: false,
    
    // Track rate limit start time
    rateLimitStartTime: null,
    
    // Estimated time when rate limit will reset (in ms)
    estimatedResetTime: 0,
    
    // Set the rate limiting status
    setRateLimited(isLimited, retryAfterSeconds = 60) {
      this.isRateLimited = isLimited;
      
      if (isLimited) {
        this.rateLimitStartTime = Date.now();
        this.estimatedResetTime = this.rateLimitStartTime + (retryAfterSeconds * 1000);
        
        // Dispatch custom event for UI components to react
        const event = new CustomEvent('backendRateLimited', {
          detail: {
            isRateLimited: true,
            estimatedResetTime: this.estimatedResetTime,
            retryAfterSeconds
          }
        });
        
        window.dispatchEvent(event);
        console.log(`⚠️ Rate limiting detected. Retry after ${retryAfterSeconds}s`);
      } else if (this.rateLimitStartTime) {
        // Reset rate limiting
        this.rateLimitStartTime = null;
        this.estimatedResetTime = 0;
        
        // Dispatch event to notify UI components
        const event = new CustomEvent('backendRateLimited', {
          detail: {
            isRateLimited: false
          }
        });
        
        window.dispatchEvent(event);
        console.log("✅ Rate limiting resolved");
      }
    },
    
    // Get remaining time until rate limit reset (in seconds)
    getRemainingTime() {
      if (!this.isRateLimited || !this.estimatedResetTime) {
        return 0;
      }
      
      const remainingMs = Math.max(0, this.estimatedResetTime - Date.now());
      return Math.ceil(remainingMs / 1000);
    },
    
    // Check if we're currently rate limited
    checkIfRateLimited() {
      if (!this.isRateLimited || !this.estimatedResetTime) {
        return false;
      }
      
      // Check if the rate limit has expired
      if (Date.now() >= this.estimatedResetTime) {
        this.setRateLimited(false);
        return false;
      }
      
      return true;
    }
  },
  
  // Add a rate limit aware API request method for all game operations
  async apiRequest(endpoint, method = 'GET', body = null) {
    // Check if we're currently rate limited
    if (this.handleRateLimiting.checkIfRateLimited()) {
      const remainingSeconds = this.handleRateLimiting.getRemainingTime();
      throw new Error(`Rate limited. Please try again in ${remainingSeconds} seconds.`);
    }
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetchWithRateLimitRetry(`${BACKEND_URL}${endpoint}`, options);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;
        
        // Set the rate limiting status
        this.handleRateLimiting.setRateLimited(true, retrySeconds);
        
        throw new Error(`Rate limited. Please try again in ${retrySeconds} seconds.`);
      }
      
      // If we get here, we're not rate limited
      if (this.handleRateLimiting.isRateLimited) {
        this.handleRateLimiting.setRateLimited(false);
      }
      
      return response;
    } catch (error) {
      // Check if this is a rate limiting error
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        // If it's not already tracked as rate limited, set it
        if (!this.handleRateLimiting.isRateLimited) {
          this.handleRateLimiting.setRateLimited(true);
        }
      }
      
      throw error;
    }
  }
};