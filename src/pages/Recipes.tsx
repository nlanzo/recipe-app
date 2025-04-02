import { Box, Typography } from "@mui/material"
import RecipeList from "../components/RecipeList"

export default function Recipes() {
  return (
    <Box margin={4} alignItems={"center"} sx={{ maxWidth: "xl", mx: "auto" }}>
      <Typography
        component="h2"
        sx={{
          fontSize: { xs: "2rem", md: "3rem" },
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 4,
          color: "secondary.main",
        }}
      >
        Explore Our Recipes
      </Typography>
      <RecipeList />
    </Box>
  )
}
