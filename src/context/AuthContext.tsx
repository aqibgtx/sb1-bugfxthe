import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, tempKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to validate user object
const isValidUser = (user: any): user is User => {
  return user && 
         typeof user === 'object' && 
         typeof user.id === 'string' && 
         user.id.length > 0 &&
         typeof user.email === 'string' &&
         typeof user.role === 'string' &&
         user.role.length > 0;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('budget_plus_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate the parsed user object
        if (isValidUser(parsedUser)) {
          setUser(parsedUser);
        } else {
          console.warn('Invalid user data found in localStorage, removing...');
          localStorage.removeItem('budget_plus_user');
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('budget_plus_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, tempKey: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('temp_key', tempKey)
        .eq('approved', true)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Database error during login:', error);
        return false;
      }

      if (!data) {
        console.log('Login failed: No user found with provided credentials or account not approved/active');
        return false;
      }

      // Validate the user data before setting
      if (!isValidUser(data)) {
        console.error('Invalid user data received from database');
        return false;
      }

      setUser(data);
      localStorage.setItem('budget_plus_user', JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem('budget_plus_user');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};