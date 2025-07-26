import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Set global timezone configuration for the application
// This ensures all date operations default to Malaysia timezone
if (typeof window !== 'undefined') {
  // Set default timezone for Intl operations
  const originalToLocaleString = Date.prototype.toLocaleString;
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
  
  // Override default locale methods to use Malaysia timezone when no timezone is specified
  Date.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const defaultOptions = { timeZone: 'Asia/Kuala_Lumpur', ...options };
    return originalToLocaleString.call(this, locales || 'en-MY', defaultOptions);
  };
  
  Date.prototype.toLocaleDateString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const defaultOptions = { timeZone: 'Asia/Kuala_Lumpur', ...options };
    return originalToLocaleDateString.call(this, locales || 'en-MY', defaultOptions);
  };
  
  Date.prototype.toLocaleTimeString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const defaultOptions = { timeZone: 'Asia/Kuala_Lumpur', ...options };
    return originalToLocaleTimeString.call(this, locales || 'en-MY', defaultOptions);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
