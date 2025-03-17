import { Button, Box, Typography, useTheme, useMediaQuery } from "@mui/material"
import { useNavigate } from "react-router-dom"

export default function Home() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const handleViewRecipesClick = () => {
    navigate("/recipes")
  }

  return (
    <Box
      component="div"
      sx={{
        width: { xs: 0.9, sm: 0.8 },
        margin: "auto",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 4,
        alignItems: "center",
      }}
    >
      {/* Splash Image - Hidden on mobile */}
      {!isMobile && (
        <Box sx={{ flex: 1 }}>
          <img
            src="./plate-of-food.png"
            alt="Plate of meat, potatoes, and salad"
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </Box>
      )}
      <Box sx={{ flex: 1 }}>
        {/* Website Description */}
        <Typography
          variant="h1"
          sx={{
            textAlign: "center",
            color: "secondary.main",
            fontSize: {
              xs: "2.5rem", // mobile
              sm: "3.5rem", // tablet
              md: "4.5rem", // desktop
              lg: "5rem", // large desktop
            },
            lineHeight: {
              xs: 1.2,
              sm: 1.3,
              md: 1.4,
            },
            marginTop: isMobile ? 4 : 0,
          }}
        >
          Unleash Your Inner Chef
        </Typography>

        {/* Button to View Recipes */}
        <Button
          sx={{
            margin: "auto",
            display: "block",
            marginTop: { xs: 3, sm: 4 },
            width: { xs: "100%", sm: "auto" },
          }}
          variant="contained"
          size="large"
          onClick={handleViewRecipesClick}
        >
          Explore Recipes
        </Button>
      </Box>
    </Box>
  )
}
