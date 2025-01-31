import { Box, Typography, Tabs, Tab } from "@mui/material"
import { useState } from "react"
import Grid from "@mui/material/Grid2"
import RecipeCard from "../components/RecipeCard"
import { useDataLoader } from "../components/useDataLoader"
import { RecipeCardProps } from "../components/RecipeCard"

export default function Profile() {
  const [activeTab, setActiveTab] = useState(0)
  const savedRecipes = useDataLoader<RecipeCardProps[]>(
    "/api/user/saved-recipes"
  )

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Box sx={{ maxWidth: "xl", mx: "auto", p: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 4 }}>
        <Tab label="Saved Recipes" />
        <Tab label="My Recipes" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={2}>
          {savedRecipes.data?.map((recipe) => (
            <Grid key={recipe.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <RecipeCard {...recipe} />
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Typography>My recipes implementation coming soon...</Typography>
      )}
    </Box>
  )
}
