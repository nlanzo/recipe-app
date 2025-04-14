import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./Layout" // Adjust the path based on your file structure
import Home from "./pages/Home" // Your Home page component
import Recipes from "./pages/Recipes" // Your Recipes page component
import About from "./pages/About" // Your About Us page component
import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import RecipeDetails from "./pages/RecipeDetails" // Example details page
import { ThemeProvider } from "./contexts/ThemeContext"
import { AuthProvider } from "./contexts/AuthProvider"
import AddRecipe from "./pages/AddRecipe"
import EditRecipe from "./pages/EditRecipe"
import ProtectedRoute from "./components/ProtectedRoute"
import Profile from "./pages/Profile"
import Account from "./pages/Account"
import RecipeChatPage from "./pages/RecipeChat"
import AdminRoute from "./components/AdminRoute"
import AdminPanel from "./components/AdminPanel"

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
              <Route path="chat" element={<RecipeChatPage />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
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
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
