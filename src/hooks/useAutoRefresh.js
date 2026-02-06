import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Custom hook for auto-refreshing data on specific pages
export const useAutoRefresh = (refreshFunction, interval = 30000, enabledPages = []) => {
  const location = useLocation();
  const intervalRef = useRef(null);
  const isActiveRef = useRef(false);
  const lastCallRef = useRef(0);

  // Memoize the refresh function to prevent unnecessary re-renders
  const stableRefreshFunction = useCallback(refreshFunction, [refreshFunction]);

  useEffect(() => {
    // Check if current page should have auto-refresh
    const shouldAutoRefresh = enabledPages.some(page => 
      location.pathname === page || location.pathname.startsWith(page)
    );

    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      isActiveRef.current = false;
    }

    if (shouldAutoRefresh && stableRefreshFunction && !isActiveRef.current) {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Auto-refresh active for:', location.pathname);
      }
      isActiveRef.current = true;

      // Set up new interval with throttling
      intervalRef.current = setInterval(async () => {
        const now = Date.now();
        // Prevent rapid successive calls (minimum 5 seconds between calls)
        if (now - lastCallRef.current < 5000) {
          return;
        }
        lastCallRef.current = now;

        try {
          await stableRefreshFunction();
        } catch (error) {
          // Silently handle auto-refresh errors - no console logs
          // But prevent further calls if there's a persistent error
          if (error.response?.status === 404) {
            console.warn('Auto-refresh stopped due to 404 error:', error.config?.url);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
              isActiveRef.current = false;
            }
          }
        }
      }, interval);

      // Initial refresh when page loads (only once, with throttling)
      const now = Date.now();
      if (now - lastCallRef.current >= 5000) {
        lastCallRef.current = now;
        try {
          stableRefreshFunction();
        } catch (error) {
          // Silent error handling
        }
      }
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isActiveRef.current = false;
      }
    };
  }, [location.pathname, stableRefreshFunction, interval, enabledPages]);

  // Manual refresh function with throttling
  const manualRefresh = useCallback(async () => {
    if (stableRefreshFunction) {
      const now = Date.now();
      // Prevent rapid manual refreshes (minimum 2 seconds between manual calls)
      if (now - lastCallRef.current < 2000) {
        return;
      }
      lastCallRef.current = now;

      try {
        await stableRefreshFunction();
      } catch (error) {
        // Silent error handling
      }
    }
  }, [stableRefreshFunction]);

  return { manualRefresh };
};

// Hook for specific data types
export const useCarDataRefresh = (fetchCars) => {
  return useAutoRefresh(
    fetchCars,
    30000, // 30 seconds
    ['/cars', '/owner/manage-cars', '/owner/car-approvals']
  );
};

export const useBookingDataRefresh = (fetchBookings) => {
  return useAutoRefresh(
    fetchBookings,
    15000, // 15 seconds for more frequent booking updates
    ['/my-bookings', '/owner/manage-bookings']
  );
};

export const useDashboardDataRefresh = (fetchDashboardData) => {
  return useAutoRefresh(
    fetchDashboardData,
    30000, // 30 seconds for dashboard
    ['/owner/dashboard', '/owner'] // /owner is the route path, not API endpoint
  );
};