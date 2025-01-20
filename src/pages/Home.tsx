import { Button, Box, Typography } from "@mui/material"
import Grid from "@mui/material/Grid2"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()

  const handleViewRecipesClick = () => {
    navigate("/recipes") // Navigate to the recipes page
  }

  return (
    <Box component="div" sx={{ width: 0.8, margin: "auto" }}>
      <Grid container spacing={4}>
        {/* Splash Image */}
        <Grid size={{ xs: 6 }}>
          <img
            src="./plate-of-food.jpg"
            alt="Plate of meat, potatoes, and salad"
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          {/* Website Description */}
          <Typography
            variant="h1"
            sx={{
              textAlign: "center",
              color: "secondary.main",
            }}
          >
            Cooking Made Fun and Easy: Unleash Your Inner Chef
          </Typography>

          {/* Button to View Recipes */}
          <Button
            sx={{ margin: "auto", display: "block", marginTop: 4 }}
            variant="contained"
            size="large"
            onClick={handleViewRecipesClick}
          >
            Explore Recipes
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}
