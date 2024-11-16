import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "./Layout" // Adjust the path based on your file structure
import Home from "./pages/Home" // Your Home page component
import Recipes from "./pages/Recipesf" // Your Recipes page component
import About from "./pages/About" // Your About Us page component
import Login from "./pages/Login" // Your Login page component
import RecipeDetails from "./pages/RecipeDetails" // Example details page

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Wrap pages in the Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="recipes/:id" element={<RecipeDetails />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
