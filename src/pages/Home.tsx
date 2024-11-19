import { Button, Box, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()

  const handleViewRecipesClick = () => {
    navigate("/recipes") // Navigate to the recipes page
  }

  return (
    <Box
      component="div"
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary to-secondary"
    >
      {/* Splash Image */}
      <img
        src="https://via.placeholder.com/800x400" // Replace with your actual image URL
        alt="Delicious food splash"
        className="w-full max-w-4xl rounded-md shadow-lg mb-6"
      />

      {/* Website Description */}
      <Typography
        variant="h2"
        className="text-white font-bold text-center mb-4 px-4"
      >
        Welcome to Recipe App
      </Typography>
      <Typography
        variant="body1"
        className="text-white text-center max-w-2xl mb-6"
      >
        Discover and share your favorite recipes from around the world. Whether
        you're a professional chef or just getting started, Recipe App is your
        go-to platform for culinary inspiration.
      </Typography>

      {/* Button to View Recipes */}
      <Button
        variant="contained"
        size="large"
        className="bg-primary text-black hover:bg-primary/90 px-6 py-3"
        onClick={handleViewRecipesClick}
      >
        View All Recipes
      </Button>
    </Box>
  )
}
