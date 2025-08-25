import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest'
import { useRouter } from 'next/navigation'
import { AuthProvider } from '@/hooks/useAuth'
import { LoginForm } from '@/components/auth/login-form'
import { api } from '@/lib/api'
import { mockUser, mockApiResponse, mockApiError } from '@/test/utils'

// Mock dependencies
vi.mock('next/navigation')
vi.mock('@/lib/api')

const mockUseRouter = vi.mocked(useRouter)
const mockApi = vi.mocked(api)
const mockPush = vi.fn()

const renderAuthFlow = (component: React.ReactNode) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any)

    // Clear all mocks
    mockApi.post.mockClear()
    mockApi.get.mockClear()
    mockPush.mockClear()
    
    // Clear cookies
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('complete login flow with valid credentials', async () => {
    const user = userEvent.setup()
    
    // Mock successful login
    mockApi.post.mockResolvedValue(mockApiResponse({
      user: mockUser,
      tokens: {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token'
      }
    }))
    
    renderAuthFlow(<LoginForm />)
    
    // Fill form with valid credentials
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Verify API was called with correct data
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@maskwise.com',
        password: 'admin123'
      })
    })
    
    // Verify redirect to dashboard
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('handles invalid credentials gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock login failure
    mockApi.post.mockRejectedValue(mockApiError(401, 'Invalid credentials'))
    
    renderAuthFlow(<LoginForm />)
    
    // Fill form with invalid credentials
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    
    // Verify no redirect occurred
    expect(mockPush).not.toHaveBeenCalled()
  })

  test('handles server errors during login', async () => {
    const user = userEvent.setup()
    
    // Mock server error
    mockApi.post.mockRejectedValue(mockApiError(500, 'Internal Server Error'))
    
    renderAuthFlow(<LoginForm />)
    
    // Fill form
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
  })

  test('handles network connectivity issues', async () => {
    const user = userEvent.setup()
    
    // Mock network error
    mockApi.post.mockRejectedValue(new Error('Network Error'))
    
    renderAuthFlow(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  test('form validation prevents submission with invalid data', async () => {
    const user = userEvent.setup()
    
    renderAuthFlow(<LoginForm />)
    
    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Check validation messages
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    
    // Verify API was not called
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  test('form validation checks email format', async () => {
    const user = userEvent.setup()
    
    renderAuthFlow(<LoginForm />)
    
    // Enter invalid email
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.type(screen.getByLabelText(/password/i), 'validpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
    
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  test('form validation checks password length', async () => {
    const user = userEvent.setup()
    
    renderAuthFlow(<LoginForm />)
    
    // Enter short password
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), '123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
    
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  test('shows loading state during login request', async () => {
    const user = userEvent.setup()
    
    // Mock delayed response
    mockApi.post.mockImplementation(
      () => new Promise(resolve => 
        setTimeout(() => resolve(mockApiResponse({
          user: mockUser,
          tokens: { accessToken: 'token', refreshToken: 'refresh' }
        })), 200)
      )
    )
    
    renderAuthFlow(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Verify loading state
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })

  test('retry mechanism works for failed requests', async () => {
    const user = userEvent.setup()
    
    // First call fails, second succeeds
    mockApi.post
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue(mockApiResponse({
        user: mockUser,
        tokens: { accessToken: 'token', refreshToken: 'refresh' }
      }))
    
    renderAuthFlow(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // First attempt fails
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
    
    // Retry button should be available
    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
    
    // Click retry
    await user.click(retryButton)
    
    // Second attempt should succeed
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
    
    expect(mockApi.post).toHaveBeenCalledTimes(2)
  })
})