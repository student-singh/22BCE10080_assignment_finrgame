import React, { useState, useEffect } from 'react';

/**
 * Component to display CORS error notifications
 * Helps users understand connection issues related to CORS
 */
const CorsErrorNotification = () => {
  const [visible, setVisible] = useState(false);
  const [errorInfo, setErrorInfo] = useState({
    message: 'Unable to connect to the server due to CORS restrictions.',
    isCorsError: true
  });

  useEffect(() => {
    const handleCorsError = (event) => {
      const { isCorsError, message } = event.detail;
      if (isCorsError) {
        setErrorInfo({
          message: message || 'Unable to connect to the server due to CORS restrictions.',
          isCorsError: true
        });
        setVisible(true);
      }
    };

    window.addEventListener('backendConnectionError', handleCorsError);

    return () => {
      window.removeEventListener('backendConnectionError', handleCorsError);
    };
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeeba',
      padding: '15px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      maxWidth: '500px',
      width: '90%',
      animation: 'fadeIn 0.5s'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '10px'
      }}>
        <span style={{ fontSize: '24px', marginRight: '10px' }}>⚠️</span>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
            Connection Error: CORS Policy Restriction
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            {errorInfo.message}
          </p>
        </div>
      </div>

      <div style={{
        backgroundColor: 'rgba(133, 100, 4, 0.1)',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '13px',
        marginBottom: '10px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Why is this happening?</p>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li>The server may be down or restarting</li>
          <li>Your browser is blocking cross-origin requests for security</li>
          <li>The server doesn't have CORS properly configured</li>
        </ul>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#856404',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            backgroundColor: 'transparent',
            color: '#856404',
            border: '1px solid #856404',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Dismiss
        </button>
      </div>

      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default CorsErrorNotification;
