import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  getAccessToken,
  setAccessToken,
  refreshAccessToken,
  createAuthenticatedFetch,
} from "../auth"

// Mock local storage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

// Mock fetch
global.fetch = vi.fn()
const mockFetch = global.fetch as ReturnType<typeof vi.fn>

// Mock window.location
const mockLocation = {
  href: "",
}
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
})

describe("Auth Utilities", () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    })
    mockFetch.mockClear()
    localStorageMock.clear()
    mockLocation.href = ""
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe("setAccessToken", () => {
    it("should save token to localStorage when token is provided", () => {
      const token = "test-token"
      setAccessToken(token)

      expect(localStorageMock.setItem).toHaveBeenCalledWith("token", token)
      expect(getAccessToken()).toBe(token)
    })

    it("should remove token from localStorage when null is provided", () => {
      setAccessToken(null)

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("token")
      expect(getAccessToken()).toBeNull()
    })
  })

  describe("refreshAccessToken", () => {
    it("should refresh the token successfully", async () => {
      const newToken = "new-token"

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newToken }),
      })

      const result = await refreshAccessToken()

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })
      expect(result).toBe(newToken)
      expect(getAccessToken()).toBe(newToken)
    })

    it("should throw an error if refresh fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      // Just check that the refresh token call throws the expected error
      await expect(refreshAccessToken()).rejects.toThrow(
        "Failed to refresh token"
      )
    })
  })

  describe("createAuthenticatedFetch", () => {
    it("should add Authorization header with token", async () => {
      const token = "test-token"
      setAccessToken(token)

      mockFetch.mockResolvedValueOnce({
        status: 200,
      })

      const authenticatedFetch = createAuthenticatedFetch()
      await authenticatedFetch("/api/test")

      expect(mockFetch).toHaveBeenCalledWith("/api/test", {
        headers: expect.any(Headers),
      })

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers.get("Authorization")).toBe(`Bearer ${token}`)
    })

    it("should try to refresh token if no token exists", async () => {
      setAccessToken(null)
      const newToken = "new-token"

      // First fetch call is to refresh the token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newToken }),
      })

      // Second fetch call is the actual API call
      mockFetch.mockResolvedValueOnce({
        status: 200,
      })

      const authenticatedFetch = createAuthenticatedFetch()
      await authenticatedFetch("/api/test")

      // First call should be to refresh the token
      expect(mockFetch).toHaveBeenNthCalledWith(1, "/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })

      // Second call should be the actual API call with the new token
      expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/test", {
        headers: expect.any(Headers),
      })

      // Check that the Authorization header contains the new token
      const headers = mockFetch.mock.calls[1][1].headers
      expect(headers.get("Authorization")).toBe(`Bearer ${newToken}`)
    })

    it("should retry request with new token if 401 response is received", async () => {
      const oldToken = "old-token"
      const newToken = "new-token"
      setAccessToken(oldToken)

      // First fetch call returns 401
      mockFetch.mockResolvedValueOnce({
        status: 401,
      })

      // Second fetch call is to refresh the token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newToken }),
      })

      // Third fetch call is the retry with the new token
      mockFetch.mockResolvedValueOnce({
        status: 200,
      })

      const authenticatedFetch = createAuthenticatedFetch()
      await authenticatedFetch("/api/test")

      // Check that the final fetch was called with the new token
      const finalHeaders = mockFetch.mock.calls[2][1].headers
      expect(finalHeaders.get("Authorization")).toBe(`Bearer ${newToken}`)
    })

    it("should redirect to login page if token refresh fails", async () => {
      setAccessToken(null)

      // Fetch call to refresh token fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      const authenticatedFetch = createAuthenticatedFetch()

      try {
        await authenticatedFetch("/api/test")
        // Should not reach here
        expect(false).toBe(true)
      } catch {
        // Expected to throw, error intentionally not used
      }

      // Should redirect to login page
      expect(mockLocation.href).toBe("/login")
    })
  })
})
