import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DatabaseStatus = () => {
  const [status, setStatus] = useState({ loading: true, connected: false, error: null });

  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        const response = await axios.get('/health');
        const isConnected = response.data.database?.status === 'Connected' || 
                           response.data.database === 'Connected';
        
        setStatus({
          loading: false,
          connected: isConnected,
          error: null,
          details: response.data
        });
      } catch (error) {
        console.error('Database status check failed:', error);
        setStatus({
          loading: false,
          connected: false,
          error: error.message,
          details: null
        });
      }
    };

    checkDatabaseStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (status.loading) {
    return null; // Don't show anything while loading
  }

  if (status.connected) {
    return null; // Don't show anything when connected
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#dc3545',
      color: 'white',
      padding: '10px',
      textAlign: 'center',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      ⚠️ Database connection failed - Some features may not work properly
      {status.error && (
        <span style={{ marginLeft: '10px', fontSize: '12px', opacity: 0.8 }}>
          ({status.error})
        </span>
      )}
    </div>
  );
};

export default DatabaseStatus;