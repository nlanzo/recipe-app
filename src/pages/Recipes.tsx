import { Box, Typography } from "@mui/material"
import RecipeList from "../components/RecipeList"

export default function Recipes() {
  return (
    <Box margin={4} alignItems={"center"} sx={{ maxWidth: "xl", mx: "auto" }}>
      <Typography component="h2">All Recipes</Typography>
      <RecipeList />
    </Box>
  )
}
