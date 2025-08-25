import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthProvider } from '@/hooks/useAuth'

// Mock Next.js router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Common mock data
export const mockUser = {
  id: '1',
  email: 'admin@maskwise.com',
  role: 'ADMIN',
  name: 'Admin User',
  status: 'ACTIVE',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

export const mockDashboardStats = {
  recentScans: 42,
  totalDatasets: 15,
  piiFindings: 238,
  activeProjects: 3
}

export const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'Test project description',
  status: 'ACTIVE',
  isActive: true,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  userId: '1',
  _count: {
    datasets: 5
  }
}

export const mockDataset = {
  id: 'dataset-1',
  name: 'Test Dataset',
  filename: 'test-file.txt',
  fileType: 'TXT',
  fileSize: 1024,
  sourcePath: '/uploads/test-file.txt',
  sourceType: 'UPLOAD',
  contentHash: 'hash123',
  metadataHash: 'meta123',
  status: 'COMPLETED',
  projectId: 'proj-1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  jobs: [],
  findings: [],
  _count: {
    findings: 10
  }
}

export const mockFinding = {
  id: 'finding-1',
  entityType: 'EMAIL_ADDRESS',
  value: '***@***.com',
  confidence: 0.95,
  start: 10,
  end: 25,
  context: 'Contact us at ***@***.com for support',
  lineNumber: 5,
  columnNumber: 15,
  datasetId: 'dataset-1',
  createdAt: '2023-01-01T00:00:00Z'
}

// API response helpers
export const mockApiResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {}
})

export const mockApiError = (status: number, message: string) => ({
  response: {
    status,
    data: { message },
    statusText: status === 404 ? 'Not Found' : 'Error',
    headers: {},
    config: {}
  }
})

// Test helpers for form testing
export const fillForm = async (
  user: any,
  fields: Record<string, string>
) => {
  for (const [label, value] of Object.entries(fields)) {
    const input = document.querySelector(`[name="${label}"]`) ||
                  document.querySelector(`input[placeholder*="${label}"]`) ||
                  document.querySelector(`label:has-text("${label}") + input`)
    
    if (input) {
      await user.clear(input)
      await user.type(input, value)
    }
  }
}

// Wait for loading to complete
export const waitForLoadingToFinish = async () => {
  // Wait for any loading spinners to disappear
  const loadingSpinners = document.querySelectorAll('[data-testid="loading"]')
  if (loadingSpinners.length > 0) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// Mock implementations
export const mockApiImplementations = {
  login: vi.fn().mockResolvedValue(mockApiResponse({
    user: mockUser,
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token'
    }
  })),
  
  dashboardStats: vi.fn().mockResolvedValue(mockApiResponse(mockDashboardStats)),
  
  projects: vi.fn().mockResolvedValue(mockApiResponse([mockProject])),
  
  datasets: vi.fn().mockResolvedValue(mockApiResponse({
    datasets: [mockDataset],
    total: 1,
    page: 1,
    limit: 10
  })),
  
  findings: vi.fn().mockResolvedValue(mockApiResponse({
    findings: [mockFinding],
    total: 1,
    page: 1,
    limit: 10
  }))
}