// Global Axios Configuration and Interceptors
import axios from 'axios';

// Set base URL
const API_BASE = import.meta.env.VITE_API_BASE || "";

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add cache-busting headers to prevent browser caching
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    // Add cache-busting query parameter
    const separator = config.url.includes('?') ? '&' : '?';
    config.url = `${config.url}${separator}_t=${Date.now()}`;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle authentication errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle authentication and authorization errors
      if (status === 401 || status === 403) {
        const errorMessage = data?.error || 'Authentication failed';
        
        // Check if it's an access/employment related error (don't logout for these)
        const isAccessError = errorMessage.includes('employment') || 
                             errorMessage.includes('inactive') ||
                             errorMessage.includes('on leave') ||
                             errorMessage.includes('deactivated');
        
        if (isAccessError) {
          // Show access error message and redirect to appropriate page
          handleAccessDenied(errorMessage);
        } else {
          // Invalid token - logout and redirect to login
          handleAuthenticationFailure(errorMessage);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Handle access denied (but valid token) - show message and redirect
function handleAccessDenied(message) {
  // Store the error message to show on the access denied page
  localStorage.setItem('accessDeniedMessage', message);
  
  // Redirect to access denied page
  window.location.href = '/access-denied';
}

// Handle authentication failure - clear token and redirect to login
function handleAuthenticationFailure(message) {
  // Clear stored authentication data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Store error message to show on login page
  localStorage.setItem('authErrorMessage', message);
  
  // Redirect to login
  window.location.href = '/login';
}

// Export configured axios instance
export default axiosInstance;

// Export original axios for cases where interceptors shouldn't be used
export { axios as axiosRaw };