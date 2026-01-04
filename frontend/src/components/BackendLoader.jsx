import React, { useState, useEffect } from 'react';
import useRateLimiting from '../hooks/useRateLimiting';
import { backendService } from '../services/backendService';

const BackendLoader = ({ isLoading, message = "Connecting to server..." }) => {
  const { 
    isRateLimited, 
    remainingTime, 
    isExcessiveRateLimits,
    rateLimitCount,
    retryAfterRateLimit,
    isRetrying,
  } = useRateLimiting();
  
  const [corsError, setCorsError] = useState(false);
  
  useEffect(() => {
    const handleCorsError = (event) => {
      if (event.detail && event.detail.isCorsError) {
        setCorsError(true);
      }
    };
    
    window.addEventListener('backendConnectionError', handleCorsError);
    
    return () => {
      window.removeEventListener('backendConnectionError', handleCorsError);
    };
  }, []);
  
  if (!isLoading) return null;

  return (
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
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #6ee7b7',
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px auto'
        }}></div>
        
        <h2 style={{
          fontSize: '24px',
          marginBottom: '10px',
          color: corsError 
            ? '#ff9800' 
            : isRateLimited 
              ? (isExcessiveRateLimits ? '#ff5252' : '#ff9800') 
              : '#6ee7b7'
        }}>
          {corsError 
            ? '⚠️ Connection Issue'
            : isRateLimited 
              ? (isExcessiveRateLimits ? '🚫 Too Many Requests (429)' : '⚠️ Rate Limited') 
              : '🚀 Starting Server'}
        </h2>
        
        <p style={{
          fontSize: '16px',
          marginBottom: '15px',
          color: '#fff'
        }}>
          {corsError
            ? 'Having trouble connecting to the game server.'
            : isRateLimited 
              ? `Please wait ${remainingTime} seconds before trying again${rateLimitCount > 1 ? ` (${rateLimitCount} consecutive limits)` : ''}.`
              : message}
        </p>
        
        <p style={{
          fontSize: '14px',
          color: '#94a3b8',
          lineHeight: '1.5'
        }}>
          {corsError
            ? 'Your browser is blocking cross-origin requests (CORS). This may be due to server configuration or the server might be temporarily down.'
            : isRateLimited 
              ? (isExcessiveRateLimits 
                ? 'The server is experiencing heavy traffic or may be temporarily unavailable. We are implementing exponential backoff to avoid further rate limiting.'
                : 'Our server has received too many requests in a short time period. This is a temporary issue and will resolve automatically.')
              : 'Our server is waking up from sleep mode. This usually takes 30-60 seconds for the first visit.'}
        </p>
        
        {isRateLimited && (
          <div style={{ 
            height: '6px', 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            marginTop: '15px',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: isExcessiveRateLimits ? '#ff5252' : '#ff9800',
              width: `${remainingTime > 0 ? (remainingTime / 60) * 100 : 100}%`,
              maxWidth: '100%',
              transition: 'width 1s linear'
            }}></div>
          </div>
        )}
        
        {(isRateLimited || corsError) && (
          <button
            onClick={() => {
              if (corsError) {
                window.location.reload();
              } else {
                retryAfterRateLimit(async () => {
                  // Try to wake up backend and wait for response
                  await backendService.wakeUpBackend();
                  return backendService.waitForBackend(5, 2000);
                });
              }
            }}
            disabled={!corsError && (isRetrying || remainingTime > 10)}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: corsError
                ? 'rgba(255, 152, 0, 0.3)'
                : isExcessiveRateLimits 
                  ? 'rgba(255, 82, 82, 0.3)' 
                  : 'rgba(255, 152, 0, 0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !corsError && (isRetrying || remainingTime > 10) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: !corsError && (isRetrying || remainingTime > 10) ? 0.5 : 1
            }}
          >
            {corsError 
              ? 'Reload Page' 
              : isRetrying 
                ? 'Attempting to reconnect...' 
                : 'Try Reconnecting'}
          </button>
        )}
        
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
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default BackendLoader;
