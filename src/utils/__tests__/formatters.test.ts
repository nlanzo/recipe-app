import { describe, it, expect } from "vitest"
import { formatCookingTime, formatDate, truncateText } from "../formatters"

describe("Formatter Utilities", () => {
  describe("formatCookingTime", () => {
    it("should format minutes only", () => {
      expect(formatCookingTime(30)).toBe("30 min")
      expect(formatCookingTime(1)).toBe("1 min")
      expect(formatCookingTime(59)).toBe("59 min")
    })

    it("should format hours only", () => {
      expect(formatCookingTime(60)).toBe("1 hr")
      expect(formatCookingTime(120)).toBe("2 hrs")
    })

    it("should format hours and minutes", () => {
      expect(formatCookingTime(90)).toBe("1 hr 30 min")
      expect(formatCookingTime(150)).toBe("2 hrs 30 min")
    })

    it("should handle zero minutes", () => {
      expect(formatCookingTime(0)).toBe("0 min")
    })

    it("should throw error for negative time", () => {
      expect(() => formatCookingTime(-10)).toThrow(
        "Time must be a positive number"
      )
    })
  })

  describe("formatDate", () => {
    it("should format date correctly", () => {
      // Create a specific date for consistent testing
      const testDate = new Date(2023, 4, 15) // May 15, 2023
      expect(formatDate(testDate)).toBe("May 15, 2023")
    })

    it("should handle different dates", () => {
      const newYearsDay = new Date(2024, 0, 1) // January 1, 2024
      expect(formatDate(newYearsDay)).toBe("January 1, 2024")
    })
  })

  describe("truncateText", () => {
    it("should not truncate text shorter than max length", () => {
      expect(truncateText("Hello", 10)).toBe("Hello")
      expect(truncateText("Hello", 5)).toBe("Hello")
    })

    it("should truncate text longer than max length", () => {
      expect(truncateText("Hello World", 5)).toBe("Hello...")
      expect(truncateText("This is a long text", 7)).toBe("This is...")
    })

    it("should handle empty string", () => {
      expect(truncateText("", 10)).toBe("")
    })

    it("should handle exact length", () => {
      expect(truncateText("Hello", 5)).toBe("Hello")
    })
  })
})
