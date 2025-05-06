import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "../../test/utils"
import RecipeCard, { RecipeCardProps } from "../RecipeCard"
import "@testing-library/jest-dom"

// Mock useNavigate hook
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

const mockNavigate = vi.fn()

describe("RecipeCard", () => {
  // Sample recipe data for testing
  const sampleRecipe: RecipeCardProps = {
    id: 1,
    title: "Test Recipe",
    imageUrl: "test-image.jpg",
    totalTimeInMinutes: 30,
    numberOfServings: 4,
  }

  // Reset the mock between tests
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  it("renders recipe information correctly", () => {
    render(<RecipeCard {...sampleRecipe} />)

    // Check if title and information are displayed
    expect(screen.getByText("Test Recipe")).toBeInTheDocument()
    expect(screen.getByText("Total Time: 30 mins")).toBeInTheDocument()
    expect(screen.getByText("Servings: 4")).toBeInTheDocument()

    // Check if image is rendered with correct attributes
    const image = screen.getByRole("img")
    expect(image).toHaveAttribute("src", "test-image.jpg")
    expect(image).toHaveAttribute("alt", "Test Recipe")
  })

  it("navigates to recipe details page when clicked", () => {
    render(<RecipeCard {...sampleRecipe} />)

    // Simulate a click on the card
    fireEvent.click(screen.getByText("Test Recipe"))

    // Verify navigation was called with the correct route
    expect(mockNavigate).toHaveBeenCalledWith("/recipes/1")
  })

  it("handles null image URL", () => {
    const recipeWithoutImage = { ...sampleRecipe, imageUrl: null }
    render(<RecipeCard {...recipeWithoutImage} />)

    // Check if image fallback is used
    const image = screen.getByRole("img")
    expect(image).toHaveAttribute("src", "not found")
  })
})
