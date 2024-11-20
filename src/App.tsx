import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./Layout" // Adjust the path based on your file structure
import Home from "./pages/Home" // Your Home page component
import Recipes from "./pages/Recipes" // Your Recipes page component
import About from "./pages/About" // Your About Us page component
// import Login from "./pages/Login" // Your Login page component
import RecipeDetails from "./pages/RecipeDetails" // Example details page
import { createTheme, ThemeProvider } from "@mui/material"
import { themeOptions } from "./theme"
const theme = createTheme(themeOptions)

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          {/* Wrap pages in the Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recipes/:id" element={<RecipeDetails />} />
            <Route path="about" element={<About />} />
            {/* <Route path="login" element={<Login />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
