import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// SECURITY: withCredentials allows HttpOnly cookies to be automatically sent with requests
// This works with the server-side Set-Cookie headers that have HttpOnly, Secure, and SameSite flags
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with CORS requests
});

// Request interceptor - no longer needed to manually add auth token
// SECURITY: Tokens are now in HttpOnly cookies, automatically sent by browser
// The server's JWT strategy reads from cookies instead of Authorization header
api.interceptors.request.use(
  (config) => {
    // Cookies are automatically included with withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
// SECURITY: Tokens are HttpOnly cookies, we can't access them from JavaScript
// Server automatically handles cookie refresh via Set-Cookie headers
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call refresh endpoint - cookies are automatically sent via withCredentials
        // Server will set new HttpOnly cookies in the response
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {}, // Body can be empty, refresh token is in HttpOnly cookie
          { withCredentials: true } // Send cookies with this request
        );

        // New tokens are now set as HttpOnly cookies by the server
        // Retry the original request with the new cookies
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        // We can't clear HttpOnly cookies from JavaScript, but server will handle it
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;