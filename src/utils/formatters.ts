/**
 * Format a number of minutes into a human-readable time format (e.g., "1 hr 30 min")
 */
export function formatCookingTime(timeInMinutes: number): string {
  if (timeInMinutes < 0) {
    throw new Error("Time must be a positive number")
  }

  if (timeInMinutes === 0) {
    return "0 min"
  }

  const hours = Math.floor(timeInMinutes / 60)
  const minutes = timeInMinutes % 60

  let result = ""

  if (hours > 0) {
    result += `${hours} hr`
    if (hours > 1) {
      result += "s"
    }
  }

  if (minutes > 0) {
    if (hours > 0) {
      result += " "
    }
    result += `${minutes} min`
  }

  return result
}

/**
 * Format a date into a readable format (e.g., "May 15, 2023")
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

/**
 * Truncate a string to a maximum length and add ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength) + "..."
}
