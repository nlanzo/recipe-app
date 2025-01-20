import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./Layout" // Adjust the path based on your file structure
import Home from "./pages/Home" // Your Home page component
import Recipes from "./pages/Recipes" // Your Recipes page component
import About from "./pages/About" // Your About Us page component
// import Login from "./pages/Login" // Your Login page component
import RecipeDetails from "./pages/RecipeDetails" // Example details page
import { ThemeProvider } from "./contexts/ThemeContext"
import AddRecipe from "./pages/AddRecipe"
import EditRecipe from "./pages/EditRecipe"

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Wrap pages in the Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="add" element={<AddRecipe />} />"
            <Route path="recipes/:id" element={<RecipeDetails />} />
            <Route path="about" element={<About />} />
            <Route path="recipes/:id/edit" element={<EditRecipe />} />
            {/* <Route path="login" element={<Login />} /> */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
