import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DatabaseStatus = () => {
  const [status, setStatus] = useState({ loading: true, connected: false, error: null });

  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        // Test the direct database test function
        const response = await axios.get('/.netlify/functions/test-db');
        
        setStatus({
          loading: false,
          connected: true,
          error: null,
          details: response.data
        });
      } catch (error) {
        console.error('Database status check failed:', error);
        
        let errorMessage = 'Connection failed';
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setStatus({
          loading: false,
          connected: false,
          error: errorMessage,
          details: error.response?.data
        });
      }
    };

    checkDatabaseStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    
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
        padding: '10px',
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
        padding: '10px',
        textAlign: 'center',
        zIndex: 9999,
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        ✅ Database connected successfully - All features working!
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
      padding: '10px',
      textAlign: 'center',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      ⚠️ Database connection failed - Environment variables not set properly
      {status.error && (
        <span style={{ marginLeft: '10px', fontSize: '12px', opacity: 0.8 }}>
          ({status.error})
        </span>
      )}
      <div style={{ fontSize: '12px', marginTop: '5px' }}>
        Please set environment variables in Netlify Dashboard
      </div>
    </div>
  );
};

export default DatabaseStatus;