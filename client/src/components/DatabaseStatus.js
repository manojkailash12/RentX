import React, { useState, useEffect } from 'react';

const DatabaseStatus = () => {
  const [status, setStatus] = useState({ loading: true, connected: false, error: null });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/.netlify/functions/test-db');
        const data = await response.json();
        
        if (response.ok && data.success) {
          setStatus({
            loading: false,
            connected: true,
            error: null,
            details: data
          });
        } else {
          setStatus({
            loading: false,
            connected: false,
            error: data.error || 'Connection failed',
            details: data
          });
        }
      } catch (error) {
        setStatus({
          loading: false,
          connected: false,
          error: 'Network error',
          details: null
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status.loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffc107',
        color: 'black',
        padding: '8px',
        textAlign: 'center',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        🔄 Checking database connection...
      </div>
    );
  }

  if (status.connected) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#28a745',
        color: 'white',
        padding: '8px',
        textAlign: 'center',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        ✅ All systems operational - Database connected!
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#dc3545',
      color: 'white',
      padding: '8px',
      textAlign: 'center',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      ⚠️ Database connection failed - Please set environment variables in Netlify
      {status.error && (
        <span style={{ marginLeft: '10px', fontSize: '12px', opacity: 0.8 }}>
          ({status.error})
        </span>
      )}
    </div>
  );
};

export default DatabaseStatus;