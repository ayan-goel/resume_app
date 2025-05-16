'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';

// Create the Supabase auth context
const SupabaseAuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
  resendConfirmation: async () => {},
});

// Custom hook to access the Supabase auth context
export const useSupabaseAuth = () => useContext(SupabaseAuthContext);

// Supabase auth context provider component
export function SupabaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // This effect runs once when the component mounts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // First, try to get the current session
        await checkUser();
        
        // Then, set up subscription to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event);
          
          if (session?.user) {
            setUser(session.user);
            // Add a class to document for CSS targeting
            document.documentElement.classList.add('authenticated');
          } else {
            setUser(null);
            document.documentElement.classList.remove('authenticated');
          }
          
          setIsLoading(false);
        });
        
        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Add a useEffect to sync auth state with a custom header for middleware
  useEffect(() => {
    const attachAuthHeader = () => {
      if (typeof window !== 'undefined') {
        // This is a client-side only solution to make protected routes work
        // We'll store a flag in localStorage to help with full-page refreshes
        if (user) {
          localStorage.setItem('supabaseAuth', 'true');
        } else {
          localStorage.removeItem('supabaseAuth');
        }
      }
    };
    
    attachAuthHeader();
  }, [user]);

  // Check current user session
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Found existing user session:', session.user.email);
        setUser(session.user);
        document.documentElement.classList.add('authenticated');
      } else {
        setUser(null);
        document.documentElement.classList.remove('authenticated');
      }
    } catch (error) {
      console.error('Error checking auth session:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email, password) => {
    try {
      console.log('Signing in user:', email);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Special handling for email not confirmed errors
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email to confirm your account before signing in. You can request a new confirmation email if needed.');
        }
        throw error;
      }

      console.log('Sign in successful:', data);
      
      if (data.user) {
        setUser(data.user);
        // Ensure the token is persisted
        localStorage.setItem('supabaseAuth', 'true');
      }
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to resend confirmation email
  const resendConfirmation = async (email) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  // Sign up function with access code verification
  const signUp = async (email, password, accessCode) => {
    try {
      // Verify the access code first
      if (accessCode !== "EpsilonSigma") {
        throw new Error("Invalid access code");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            access_level: 'member' // Add custom user metadata
          }
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      localStorage.removeItem('supabaseAuth');
      setUser(null);
      
      // Force a hard refresh to clear auth state completely
      window.location.href = '/';
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    resendConfirmation,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export default SupabaseAuthContext; 