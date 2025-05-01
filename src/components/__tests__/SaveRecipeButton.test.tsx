import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "../../test/utils"
import SaveRecipeButton from "../SaveRecipeButton"
import "@testing-library/jest-dom"
import * as authUtils from "../../utils/auth"
import * as authContext from "../../contexts/useAuth"

// Mock useNavigate hook
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

// Mock authenticatedFetch
vi.mock("../../utils/auth", () => ({
  authenticatedFetch: vi.fn(),
}))

// Mock useAuth hook
vi.mock("../../contexts/useAuth", () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.fn()
const mockAuthenticatedFetch = vi.fn()

describe("SaveRecipeButton", () => {
  // Reset mocks before each test
  beforeEach(() => {
    mockNavigate.mockReset()
    mockAuthenticatedFetch.mockReset()

    // Setup default mocks
    vi.mocked(authContext.useAuth).mockReturnValue({
      isAuthenticated: true,
      token: "fake-token",
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    vi.mocked(authUtils.authenticatedFetch).mockImplementation(
      mockAuthenticatedFetch
    )
  })

  it("renders Save Recipe button when not saved", async () => {
    // Mock the API responses
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<SaveRecipeButton recipeId="123" />)

    await waitFor(() => {
      expect(screen.getByText("Save Recipe")).toBeInTheDocument()
    })
  })

  it("renders Saved button when recipe is already saved", async () => {
    // Mock that recipe is already saved
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 123 }],
    })

    render(<SaveRecipeButton recipeId="123" />)

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument()
    })
  })

  it("navigates to login when not authenticated", async () => {
    // Mock not authenticated
    vi.mocked(authContext.useAuth).mockReturnValue({
      isAuthenticated: false,
      token: null,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
    })

    render(<SaveRecipeButton recipeId="123" />)

    // Button should show "Login to Save"
    expect(screen.getByText("Login to Save")).toBeInTheDocument()

    // Click the button
    fireEvent.click(screen.getByText("Login to Save"))

    // Verify navigation to login page was called
    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/recipes/123" },
    })
  })

  it("saves a recipe when clicking Save Recipe button", async () => {
    // Mock the initial check (not saved)
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    // Mock the save request
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
    })

    render(<SaveRecipeButton recipeId="123" />)

    // Wait for the initial state
    await waitFor(() => {
      expect(screen.getByText("Save Recipe")).toBeInTheDocument()
    })

    // Click the save button
    fireEvent.click(screen.getByText("Save Recipe"))

    // Verify save request was made with correct parameters
    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        "/api/recipes/123/save",
        { method: "POST" }
      )
    })

    // Verify text changes to "Saved"
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument()
    })
  })

  it("unsaves a recipe when clicking Saved button", async () => {
    // Mock the initial check (saved)
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 123 }],
    })

    // Mock the unsave request
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
    })

    render(<SaveRecipeButton recipeId="123" />)

    // Wait for the initial state
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument()
    })

    // Click the save button
    fireEvent.click(screen.getByText("Saved"))

    // Verify unsave request was made with correct parameters
    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        "/api/recipes/123/save",
        { method: "DELETE" }
      )
    })

    // Verify text changes to "Save Recipe"
    await waitFor(() => {
      expect(screen.getByText("Save Recipe")).toBeInTheDocument()
    })
  })

  it("handles API errors gracefully", async () => {
    // Spy on console.error
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})

    // Mock the initial check (not saved)
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    // Mock the save request failing
    mockAuthenticatedFetch.mockRejectedValueOnce(new Error("API error"))

    render(<SaveRecipeButton recipeId="123" />)

    // Wait for the initial state
    await waitFor(() => {
      expect(screen.getByText("Save Recipe")).toBeInTheDocument()
    })

    // Click the save button
    fireEvent.click(screen.getByText("Save Recipe"))

    // Verify error was logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error toggling save status:",
        expect.any(Error)
      )
    })

    // Button text should still be "Save Recipe" as the toggle failed
    expect(screen.getByText("Save Recipe")).toBeInTheDocument()

    // Clean up spy
    consoleErrorSpy.mockRestore()
  })

  it("handles already saved recipes gracefully", async () => {
    // Mock the initial check (not saved)
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    // Mock the save request returning 409 (already saved)
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Recipe already saved" }),
    })

    render(<SaveRecipeButton recipeId="123" />)

    // Wait for the initial state
    await waitFor(() => {
      expect(screen.getByText("Save Recipe")).toBeInTheDocument()
    })

    // Click the save button
    fireEvent.click(screen.getByText("Save Recipe"))

    // Verify save request was made with correct parameters
    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        "/api/recipes/123/save",
        { method: "POST" }
      )
    })

    // Even with 409, button should change to "Saved" as the app knows the recipe is saved
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument()
    })
  })
})
