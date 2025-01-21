import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./Layout" // Adjust the path based on your file structure
import Home from "./pages/Home" // Your Home page component
import Recipes from "./pages/Recipes" // Your Recipes page component
import About from "./pages/About" // Your About Us page component
import Login from "./pages/Login"
import Register from "./pages/Register"
import RecipeDetails from "./pages/RecipeDetails" // Example details page
import { ThemeProvider } from "./contexts/ThemeContext"
import { AuthProvider } from "./contexts/AuthContext"
import AddRecipe from "./pages/AddRecipe"
import EditRecipe from "./pages/EditRecipe"
import ProtectedRoute from "./components/ProtectedRoute"

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Wrap pages in the Layout */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="recipes" element={<Recipes />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route
                path="add"
                element={
                  <ProtectedRoute>
                    <AddRecipe />
                  </ProtectedRoute>
                }
              />
              <Route path="recipes/:id" element={<RecipeDetails />} />
              <Route path="about" element={<About />} />
              <Route
                path="recipes/:id/edit"
                element={
                  <ProtectedRoute>
                    <EditRecipe />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
