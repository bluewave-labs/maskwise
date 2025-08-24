export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Helper functions for role checking
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'ADMIN';
};

export const isMember = (user: User | null): boolean => {
  return user?.role === 'MEMBER';
};

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}