import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Custom hook to handle page refresh persistence
export const usePagePersistence = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Save current path to localStorage on route change
    localStorage.setItem('lastVisitedPath', location.pathname + location.search);
  }, [location]);

  // Function to restore last visited path
  const restoreLastPath = () => {
    const lastPath = localStorage.getItem('lastVisitedPath');
    if (lastPath && lastPath !== '/' && lastPath !== location.pathname) {
      navigate(lastPath, { replace: true });
    }
  };

  return { restoreLastPath };
};

// Hook for maintaining form state across refreshes
export const useFormPersistence = (formKey, initialState) => {
  const getPersistedState = () => {
    try {
      const saved = localStorage.getItem(`form_${formKey}`);
      return saved ? JSON.parse(saved) : initialState;
    } catch {
      return initialState;
    }
  };

  const saveFormState = (state) => {
    try {
      localStorage.setItem(`form_${formKey}`, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save form state:', error);
    }
  };

  const clearFormState = () => {
    localStorage.removeItem(`form_${formKey}`);
  };

  return { getPersistedState, saveFormState, clearFormState };
};