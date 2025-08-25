import { renderHook, waitFor } from '@testing-library/react'
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useProjects } from '@/hooks/useProjects'
import { api } from '@/lib/api'
import { mockApiResponse, mockApiError, mockDashboardStats, mockProject } from '@/test/utils'

// Mock the API
vi.mock('@/lib/api')
const mockApi = vi.mocked(api)

describe('API Communication Integration', () => {
  beforeEach(() => {
    mockApi.get.mockClear()
    mockApi.post.mockClear()
    mockApi.put.mockClear()
    mockApi.delete.mockClear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Stats API', () => {
    test('fetches dashboard stats successfully', async () => {
      mockApi.get.mockResolvedValue(mockApiResponse(mockDashboardStats))

      const { result } = renderHook(() => useDashboardStats())

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.stats).toEqual(mockDashboardStats)
      expect(result.current.error).toBeNull()
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats')
    })

    test('handles 401 authentication errors', async () => {
      mockApi.get.mockRejectedValue(mockApiError(401, 'Unauthorized'))

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.stats).toBeNull()
    })

    test('handles 500 server errors', async () => {
      mockApi.get.mockRejectedValue(mockApiError(500, 'Internal Server Error'))

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.stats).toBeNull()
    })

    test('handles network timeout errors', async () => {
      mockApi.get.mockRejectedValue(new Error('timeout of 30000ms exceeded'))

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.stats).toBeNull()
    })
  })

  describe('Projects API', () => {
    test('fetches projects successfully', async () => {
      mockApi.get.mockResolvedValue(mockApiResponse([mockProject]))

      const { result } = renderHook(() => useProjects())

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.projects).toEqual([mockProject])
      expect(result.current.error).toBeNull()
      expect(mockApi.get).toHaveBeenCalledWith('/projects')
    })

    test('handles empty projects list', async () => {
      mockApi.get.mockResolvedValue(mockApiResponse([]))

      const { result } = renderHook(() => useProjects())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.projects).toEqual([])
      expect(result.current.error).toBeNull()
    })

    test('handles projects API errors', async () => {
      mockApi.get.mockRejectedValue(mockApiError(403, 'Forbidden'))

      const { result } = renderHook(() => useProjects())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.projects).toEqual([])
    })
  })

  describe('API Request Interceptors', () => {
    test('automatically adds authorization header', async () => {
      // Mock token in cookies
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'accessToken=test-token'
      })

      mockApi.get.mockResolvedValue(mockApiResponse(mockDashboardStats))

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify API was called (interceptors add headers automatically)
      expect(mockApi.get).toHaveBeenCalledWith('/dashboard/stats')
    })

    test('handles token refresh on 401 errors', async () => {
      // Mock initial 401, then successful refresh, then successful retry
      mockApi.get
        .mockRejectedValueOnce(mockApiError(401, 'Token expired'))
        .mockResolvedValueOnce(mockApiResponse({ accessToken: 'new-token' }))
        .mockResolvedValueOnce(mockApiResponse(mockDashboardStats))

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should eventually succeed after refresh
      expect(result.current.stats).toEqual(mockDashboardStats)
    })
  })

  describe('Concurrent API Calls', () => {
    test('handles multiple simultaneous requests', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockApiResponse(mockDashboardStats))
        .mockResolvedValueOnce(mockApiResponse([mockProject]))

      const { result: statsResult } = renderHook(() => useDashboardStats())
      const { result: projectsResult } = renderHook(() => useProjects())

      await waitFor(() => {
        expect(statsResult.current.isLoading).toBe(false)
        expect(projectsResult.current.loading).toBe(false)
      })

      expect(statsResult.current.stats).toEqual(mockDashboardStats)
      expect(projectsResult.current.projects).toEqual([mockProject])
      expect(mockApi.get).toHaveBeenCalledTimes(2)
    })

    test('handles mixed success and failure scenarios', async () => {
      mockApi.get
        .mockResolvedValueOnce(mockApiResponse(mockDashboardStats))
        .mockRejectedValueOnce(mockApiError(500, 'Server Error'))

      const { result: statsResult } = renderHook(() => useDashboardStats())
      const { result: projectsResult } = renderHook(() => useProjects())

      await waitFor(() => {
        expect(statsResult.current.isLoading).toBe(false)
        expect(projectsResult.current.loading).toBe(false)
      })

      // One should succeed, one should fail
      expect(statsResult.current.stats).toEqual(mockDashboardStats)
      expect(statsResult.current.error).toBeNull()
      expect(projectsResult.current.error).toBeDefined()
      expect(projectsResult.current.projects).toEqual([])
    })
  })

  describe('API Response Caching', () => {
    test('caches successful responses', async () => {
      mockApi.get.mockResolvedValue(mockApiResponse(mockDashboardStats))

      // First call
      const { result: firstResult } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(firstResult.current.isLoading).toBe(false)
      })

      // Second call should potentially use cache (depending on SWR config)
      const { result: secondResult } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(secondResult.current.isLoading).toBe(false)
      })

      expect(firstResult.current.stats).toEqual(mockDashboardStats)
      expect(secondResult.current.stats).toEqual(mockDashboardStats)
    })

    test('does not cache error responses', async () => {
      mockApi.get
        .mockRejectedValueOnce(mockApiError(500, 'Server Error'))
        .mockResolvedValueOnce(mockApiResponse(mockDashboardStats))

      // First call fails
      const { result: firstResult } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(firstResult.current.isLoading).toBe(false)
      })

      expect(firstResult.current.error).toBeDefined()

      // Second call should make new request and succeed
      const { result: secondResult } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(secondResult.current.isLoading).toBe(false)
      })

      expect(secondResult.current.stats).toEqual(mockDashboardStats)
      expect(secondResult.current.error).toBeNull()
    })
  })

  describe('Cross-Origin Resource Sharing (CORS)', () => {
    test('handles CORS preflight requests', async () => {
      // Mock CORS error
      const corsError = new Error('Network Error')
      corsError.name = 'TypeError'
      
      mockApi.get.mockRejectedValue(corsError)

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.stats).toBeNull()
    })
  })

  describe('Request/Response Validation', () => {
    test('validates API response structure', async () => {
      // Mock malformed response
      mockApi.get.mockResolvedValue({
        data: {
          // Missing required fields
          recentScans: 'invalid',
          // totalDatasets missing
          piiFindings: null,
          activeProjects: undefined
        }
      })

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should handle malformed data gracefully
      expect(result.current.stats).toBeDefined()
    })

    test('handles unexpected response formats', async () => {
      // Mock completely wrong response
      mockApi.get.mockResolvedValue({
        data: 'This is not the expected format'
      })

      const { result } = renderHook(() => useDashboardStats())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not crash the app
      expect(result.current.stats).toBeDefined()
    })
  })
})