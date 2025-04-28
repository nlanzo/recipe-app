import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "../../test/utils"
import Home from "../Home"
import "@testing-library/jest-dom"

// Mock useNavigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

const mockNavigate = vi.fn()

// Mock useMediaQuery for testing different screen sizes
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material")
  return {
    ...(actual as object),
    useMediaQuery: () => mockIsMobile,
  }
})

let mockIsMobile = false

describe("Home Page", () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockIsMobile = false
  })

  it("renders the main heading", () => {
    render(<Home />)

    expect(screen.getByText("Unleash Your Inner Chef")).toBeInTheDocument()
  })

  it("renders the explore button", () => {
    render(<Home />)

    const exploreButton = screen.getByRole("button", {
      name: /explore recipes/i,
    })
    expect(exploreButton).toBeInTheDocument()
  })

  it("navigates to recipes page when explore button is clicked", () => {
    render(<Home />)

    const exploreButton = screen.getByRole("button", {
      name: /explore recipes/i,
    })
    fireEvent.click(exploreButton)

    expect(mockNavigate).toHaveBeenCalledWith("/recipes")
  })

  it("renders the splash image on desktop view", () => {
    mockIsMobile = false
    render(<Home />)

    const image = screen.getByAltText("Plate of meat, potatoes, and salad")
    expect(image).toBeInTheDocument()
  })

  it("hides the splash image on mobile view", () => {
    mockIsMobile = true
    render(<Home />)

    const image = screen.queryByAltText("Plate of meat, potatoes, and salad")
    expect(image).not.toBeInTheDocument()
  })
})
