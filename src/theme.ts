import { ThemeOptions, createTheme } from "@mui/material/styles"

// Define common colors
const colors = {
  primary: "#FFC567",
  secondary: "#046E1B",
}

// Light mode theme
const lightTheme: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: colors.primary,
    },
    secondary: {
      main: colors.secondary,
    },
    background: {
      default: "#f5f5f5", // Light gray/off-white color
      paper: "#ffffff",
    },
    text: {
      primary: "#1A1A1A",
      secondary: "#424242",
    },
  },
}

// Dark mode theme
const darkTheme: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: colors.primary,
    },
    secondary: {
      main: colors.secondary,
    },
    background: {
      default: "#121212",
      paper: "#1E1E1E",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#B0B0B0",
    },
  },
}

// Export both themes
export const lightThemeOptions = createTheme(lightTheme)
export const darkThemeOptions = createTheme(darkTheme)
