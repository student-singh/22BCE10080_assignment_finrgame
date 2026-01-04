import React, { useState, useEffect, useCallback } from 'react';
import useRateLimiting from '../hooks/useRateLimiting';
import { backendService } from '../services/backendService';

const RateLimitNotification = () => {
  const { 
    isRateLimited, 
    remainingTime,
    rateLimitCount,
    isExcessiveRateLimits,
    retryAfterRateLimit,
    isRetrying
  } = useRateLimiting();
  
  const [visible, setVisible] = useState(false);
  
  // Handle manual retry
  const handleRetry = useCallback(async () => {
    if (!isRateLimited) return;
    
    await retryAfterRateLimit(async () => {
      // Try to ping the backend to check if rate limit is resolved
      await backendService.wakeUpBackend();
    });
  }, [isRateLimited, retryAfterRateLimit]);
  
  // Update visibility based on rate limit status
  useEffect(() => {
    if (isRateLimited) {
      setVisible(true);
    } else if (visible && !isRetrying) {
      // When rate limit is resolved, hide after a brief delay
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isRateLimited, visible, isRetrying]);

  if (!visible) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: isRateLimited ? (isExcessiveRateLimits ? '#d32f2f' : '#f44336') : '#4caf50',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
      zIndex: 1000,
      maxWidth: '350px',
      transition: 'all 0.3s ease',
      animation: 'slide-in 0.5s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ marginRight: '8px', fontSize: '20px' }}>
          {isRateLimited ? (isExcessiveRateLimits ? '🚫' : '⚠️') : '✅'}
        </span>
        <h4 style={{ margin: '0', fontSize: '16px' }}>
          {isRateLimited 
            ? (isExcessiveRateLimits 
              ? 'Too Many Requests - 429' 
              : 'Rate Limit Detected') 
            : 'Rate Limit Resolved'}
        </h4>
      </div>
      
      <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
        {isRateLimited 
          ? (isExcessiveRateLimits
            ? `Our server is experiencing high traffic. Please wait ${remainingTime} seconds before trying again (${rateLimitCount} consecutive rate limits).`
            : `Too many requests to our server. Please wait ${remainingTime} seconds before trying again.`)
          : 'You can now continue using the application.'}
      </p>

      {isRateLimited && isExcessiveRateLimits && (
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
          The server's rate limit has been exceeded multiple times. This might indicate heavy usage or potential backend issues.
        </p>
      )}
      
      {isRateLimited && (
        <div style={{ 
          height: '4px', 
          backgroundColor: 'rgba(255, 255, 255, 0.3)', 
          marginTop: '10px',
          marginBottom: '12px',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            height: '100%', 
            backgroundColor: 'white',
            width: `${remainingTime > 0 ? (remainingTime / 60) * 100 : 100}%`,
            transition: 'width 1s linear'
          }}></div>
        </div>
      )}
      
      {isRateLimited && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={handleRetry}
            disabled={isRetrying || remainingTime > 10}
            style={{
              padding: '6px 12px',
              backgroundColor: isRetrying ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRetrying || remainingTime > 10 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isRetrying || remainingTime > 10 ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      )}
      
      <button 
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '0',
          lineHeight: '1'
        }}
      >
        ×
      </button>
      
      <style jsx="true">{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default RateLimitNotification;
