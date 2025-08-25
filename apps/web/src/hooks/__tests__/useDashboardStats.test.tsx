import { renderHook, waitFor } from '@testing-library/react'
import { expect, test, describe, vi, beforeEach } from 'vitest'
import { useDashboardStats } from '../useDashboardStats'
import { api } from '@/lib/api'

// Mock the API
vi.mock('@/lib/api')
const mockedApi = vi.mocked(api)

describe('useDashboardStats', () => {
  beforeEach(() => {
    mockedApi.get.mockClear()
    vi.clearAllMocks()
  })

  test('fetches dashboard stats successfully', async () => {
    const mockData = {
      recentScans: 42,
      totalDatasets: 15,
      piiFindings: 238,
      activeProjects: 3
    }
    
    mockedApi.get.mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useDashboardStats())

    // Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.stats).toBeNull()
    expect(result.current.error).toBeNull()

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stats).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(mockedApi.get).toHaveBeenCalledWith('/dashboard/stats')
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  test('handles API errors gracefully', async () => {
    const error = new Error('API Error')
    mockedApi.get.mockRejectedValue(error)

    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.stats).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  test('handles network errors', async () => {
    const networkError = {
      response: { status: 500, data: { message: 'Server Error' } }
    }
    mockedApi.get.mockRejectedValue(networkError)

    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.stats).toBeNull()
  })

  test('handles authentication errors', async () => {
    const authError = {
      response: { status: 401, data: { message: 'Unauthorized' } }
    }
    mockedApi.get.mockRejectedValue(authError)

    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
    expect(result.current.stats).toBeNull()
  })

  test('retry mechanism works correctly', async () => {
    const mockData = {
      recentScans: 10,
      totalDatasets: 5,
      piiFindings: 25,
      activeProjects: 1
    }

    // First call fails, second succeeds
    mockedApi.get
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useDashboardStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Check if retry was called
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
    
    // Manually trigger retry
    if (result.current.retry) {
      result.current.retry()
      
      await waitFor(() => {
        expect(result.current.stats).toEqual(mockData)
      })
    }
  })

  test('returns correct initial state', () => {
    const { result } = renderHook(() => useDashboardStats())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.stats).toBeNull()
    expect(result.current.error).toBeNull()
    expect(typeof result.current.retry).toBe('function')
  })
})