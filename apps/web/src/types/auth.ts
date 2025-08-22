export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'DATA_ENGINEER' | 'ML_ENGINEER' | 'COMPLIANCE_OFFICER';
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

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