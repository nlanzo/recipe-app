import { createContext, useState, ReactNode } from "react"
import { ThemeProvider as MUIThemeProvider } from "@mui/material"
import { lightThemeOptions, darkThemeOptions } from "../theme"

type ThemeContextType = {
  isDarkMode: boolean
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode")
    return saved ? JSON.parse(saved) : false
  })

  const toggleTheme = () => {
    setIsDarkMode((prev: boolean) => {
      const newValue = !prev
      localStorage.setItem("darkMode", JSON.stringify(newValue))
      return newValue
    })
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MUIThemeProvider
        theme={isDarkMode ? darkThemeOptions : lightThemeOptions}
      >
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  )
}
