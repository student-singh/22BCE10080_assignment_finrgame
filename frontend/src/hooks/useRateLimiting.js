import { useState, useEffect, useCallback } from 'react';
import { backendService } from '../services/backendService';

/**
 * Custom hook to handle API rate limiting and "Too Many Requests" errors
 * @param {number} defaultRetryAfter - Default wait time in seconds if not provided by server
 * @param {number} maxConsecutiveRateLimits - Number of consecutive rate limit events before showing error
 * @returns {Object} Rate limiting state and handlers
 */
const useRateLimiting = (defaultRetryAfter = 60, maxConsecutiveRateLimits = 3) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [rateLimitCount, setRateLimitCount] = useState(0);
  const [lastRateLimitTime, setLastRateLimitTime] = useState(null);
  const [retryStatus, setRetryStatus] = useState({
    isRetrying: false,
    retryCount: 0,
    maxRetries: 5
  });

  // Reset rate limit count if enough time has passed between rate limit events
  useEffect(() => {
    if (!isRateLimited && rateLimitCount > 0 && lastRateLimitTime) {
      const RESET_THRESHOLD = 5 * 60 * 1000; // 5 minutes
      const timeSinceLastRateLimit = Date.now() - lastRateLimitTime;
      
      if (timeSinceLastRateLimit > RESET_THRESHOLD) {
        setRateLimitCount(0);
      }
    }
  }, [isRateLimited, rateLimitCount, lastRateLimitTime]);

  // Check if already rate limited when component mounts
  useEffect(() => {
    if (backendService.handleRateLimiting?.isRateLimited) {
      setIsRateLimited(true);
      setRemainingTime(backendService.handleRateLimiting.getRemainingTime() || defaultRetryAfter);
    }

    // Listen for rate limiting events
    const handleRateLimitEvent = (event) => {
      const { isRateLimited, retryAfterSeconds } = event.detail;
      setIsRateLimited(isRateLimited);
      
      if (isRateLimited) {
        setRemainingTime(retryAfterSeconds || defaultRetryAfter);
        setLastRateLimitTime(Date.now());
        setRateLimitCount(prev => prev + 1);
      } else {
        setRemainingTime(0);
      }
    };

    window.addEventListener('backendRateLimited', handleRateLimitEvent);

    // Set up countdown timer
    let timerId;
    if (isRateLimited) {
      timerId = setInterval(() => {
        if (backendService.handleRateLimiting) {
          const newRemaining = backendService.handleRateLimiting.getRemainingTime();
          setRemainingTime(newRemaining);
          
          if (newRemaining <= 0) {
            clearInterval(timerId);
            setIsRateLimited(false);
            // Don't reset count here, as we want to track multiple rate limit events
          }
        } else {
          setRemainingTime(prev => {
            const newValue = prev - 1;
            if (newValue <= 0) {
              clearInterval(timerId);
              setIsRateLimited(false);
              return 0;
            }
            return newValue;
          });
        }
      }, 1000);
    }

    return () => {
      window.removeEventListener('backendRateLimited', handleRateLimitEvent);
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isRateLimited, defaultRetryAfter]);

  /**
   * Reset rate limit state and counter
   */
  const resetRateLimit = useCallback(() => {
    if (backendService.handleRateLimiting) {
      backendService.handleRateLimiting.setRateLimited(false);
    }
    setIsRateLimited(false);
    setRemainingTime(0);
    setRateLimitCount(0);
  }, []);

  /**
   * Manually attempt a retry after being rate limited
   * Uses exponential backoff if multiple retries are needed
   */
  const retryAfterRateLimit = useCallback(async (retryCallback) => {
    if (!retryCallback || typeof retryCallback !== 'function') {
      console.error('No retry callback provided to retryAfterRateLimit');
      return;
    }

    if (retryStatus.retryCount >= retryStatus.maxRetries) {
      console.error('Maximum retry attempts reached');
      return;
    }

    try {
      setRetryStatus(prev => ({ 
        ...prev, 
        isRetrying: true,
        retryCount: prev.retryCount + 1 
      }));
      
      // Calculate backoff with exponential delay
      const backoffMs = Math.min(
        30000, // max 30s
        1000 * Math.pow(1.5, retryStatus.retryCount) // exponential backoff
      );
      
      // Wait for backoff period
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
      // Execute the retry callback
      await retryCallback();
      
      // If successful, reset rate limit
      resetRateLimit();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setRetryStatus(prev => ({ 
        ...prev, 
        isRetrying: false 
      }));
    }
  }, [retryStatus.retryCount, retryStatus.maxRetries, resetRateLimit]);

  return {
    isRateLimited,
    remainingTime,
    resetRateLimit,
    rateLimitCount,
    isExcessiveRateLimits: rateLimitCount >= maxConsecutiveRateLimits,
    retryAfterRateLimit,
    isRetrying: retryStatus.isRetrying,
    retryAttempts: retryStatus.retryCount,
    maxRetries: retryStatus.maxRetries
  };
};

export default useRateLimiting;
