import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest'
import { AuthProvider } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { LoginForm } from '../login-form'
import { api } from '@/lib/api'

// Mock dependencies
vi.mock('next/navigation')
vi.mock('@/lib/api')

const mockUseRouter = vi.mocked(useRouter)
const mockApi = vi.mocked(api)
const mockPush = vi.fn()

const renderWithAuth = (component: React.ReactNode) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any)

    mockApi.post.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('renders email and password fields', () => {
    renderWithAuth(<LoginForm />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  test('validates required fields', async () => {
    const user = userEvent.setup()
    renderWithAuth(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  test('validates email format', async () => {
    const user = userEvent.setup()
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
  })

  test('validates password length', async () => {
    const user = userEvent.setup()
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), '123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  test('submits form with valid data', async () => {
    const user = userEvent.setup()
    mockApi.post.mockResolvedValue({
      data: {
        user: { id: '1', email: 'admin@maskwise.com', role: 'ADMIN' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' }
      }
    })
    
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@maskwise.com',
        password: 'admin123'
      })
    })
  })

  test('handles login errors gracefully', async () => {
    const user = userEvent.setup()
    mockApi.post.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } }
    })
    
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  test('shows loading state during form submission', async () => {
    const user = userEvent.setup()
    
    // Mock delayed response
    mockApi.post.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        data: {
          user: { id: '1', email: 'admin@maskwise.com', role: 'ADMIN' },
          tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' }
        }
      }), 100))
    )
    
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    // Should show loading state
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
    })
  })

  test('redirects to dashboard on successful login', async () => {
    const user = userEvent.setup()
    mockApi.post.mockResolvedValue({
      data: {
        user: { id: '1', email: 'admin@maskwise.com', role: 'ADMIN' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' }
      }
    })
    
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('handles network errors', async () => {
    const user = userEvent.setup()
    mockApi.post.mockRejectedValue(new Error('Network Error'))
    
    renderWithAuth(<LoginForm />)
    
    await user.type(screen.getByLabelText(/email/i), 'admin@maskwise.com')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })
})