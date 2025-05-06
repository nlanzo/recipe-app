import { Box, Typography, Tabs, Tab, Button } from "@mui/material"
import { useState, useEffect } from "react"
import Grid from "@mui/material/Grid2"
import RecipeCard from "../components/RecipeCard"
import { useDataLoader } from "../components/useDataLoader"
import { RecipeCardProps } from "../components/RecipeCard"
import { useNavigate } from "react-router-dom"

interface UserProfile {
  username: string
  email: string
  isAdmin: boolean
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState(0)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true)
  const navigate = useNavigate()

  const savedRecipes = useDataLoader<RecipeCardProps[]>(
    "/api/user/saved-recipes"
  )
  const myRecipes = useDataLoader<RecipeCardProps[]>("/api/user/my-recipes")
  const userProfile = useDataLoader<UserProfile>("/api/user/profile")

  // Check for authentication errors in any of the responses
  useEffect(() => {
    if (
      savedRecipes.error ||
      myRecipes.error ||
      userProfile.error ||
      savedRecipes.response?.status === 401 ||
      myRecipes.response?.status === 401 ||
      userProfile.response?.status === 401
    ) {
      setIsAuthenticated(false)
    }
  }, [
    savedRecipes.error,
    myRecipes.error,
    userProfile.error,
    savedRecipes.response,
    myRecipes.response,
    userProfile.response,
  ])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleLogin = () => {
    navigate("/login")
  }

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <Box sx={{ maxWidth: "xl", mx: "auto", p: 4, textAlign: "center" }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Please log in to view your profile
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleLogin}
          size="large"
        >
          Log In
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: "xl", mx: "auto", p: 4 }}>
      <Typography
        component="h4"
        sx={{
          fontSize: { xs: "2rem", md: "3rem" },
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 4,
          color: "secondary.main",
        }}
      >
        {userProfile.data
          ? `${userProfile.data.username}'s Profile`
          : "My Profile"}
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
          {savedRecipes.data?.length === 0 && (
            <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
              <Typography variant="h6">
                You haven't saved any recipes yet.
              </Typography>
            </Box>
          )}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={2}>
          {myRecipes.data?.map((recipe) => (
            <Grid key={recipe.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <RecipeCard {...recipe} />
            </Grid>
          ))}
          {myRecipes.data?.length === 0 && (
            <Box sx={{ width: "100%", textAlign: "center", py: 4 }}>
              <Typography variant="h6">
                You haven't created any recipes yet.
              </Typography>
            </Box>
          )}
        </Grid>
      )}
    </Box>
  )
}
