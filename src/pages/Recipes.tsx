import { Box, Typography } from "@mui/material"
import RecipeList from "../components/RecipeList"

type Props = {}
export default function Recipes({}: Props) {
  return (
    <Box margin={4} alignItems={"center"} sx={{ maxWidth: "xl", mx: "auto" }}>
      <Typography component="h2">All Recipes</Typography>
      <RecipeList />
    </Box>
  )
}
