'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './api';

// Helper function to set cookies
const setCookie = (name, value, days = 7) => {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

// Helper function to remove cookies
const removeCookie = (name) => {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

// Create the auth context
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  register: async () => {},
});

// Custom hook to access the auth context
export const useAuth = () => useContext(AuthContext);

// Auth context provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data } = await authAPI.getCurrentUser();
        setUser(data.user);
      } catch (error) {
        // Handle error (token invalid, expired, etc.)
        localStorage.removeItem('token');
        removeCookie('token');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      // The full axios response is { data: { error: false, message: '...', data: { id: ..., role: ..., token: ... } } }
      const response = await authAPI.login(email, password);
      const responseData = response.data; // Get the inner object { error: false, message: ..., data: ... }
      const userData = responseData.data; // Get the user data object { id: ..., role: ..., token: ... }

      if (responseData.error || !userData.token) {
        throw new Error(responseData.message || 'Login failed: Invalid response from server');
      }
      
      // Store token in both localStorage and cookies
      localStorage.setItem('token', userData.token);
      setCookie('token', userData.token);
      
      // Set user state with the actual user data object
      setUser(userData); 
      
      // Return the user data object for the login page to use
      return userData; 
    } catch (error) {
      // Log the error if it's not an axios error (which is already handled)
      if (!error.response) {
        console.error("Login function error:", error);
      }
      throw error; // Re-throw for the component to handle
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    removeCookie('token');
    setUser(null);
  };

  // Register function
  const register = async (userData) => {
    try {
      const { data } = await authAPI.register(userData);
      
      // Store token in both localStorage and cookies
      localStorage.setItem('token', data.token);
      setCookie('token', data.token);
      
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext; 