import { Box, Typography, Tabs, Tab } from "@mui/material"
import { useState, useEffect } from "react"
import Grid from "@mui/material/Grid2"
import RecipeCard from "../components/RecipeCard"
import { useDataLoader } from "../components/useDataLoader"
import { RecipeCardProps } from "../components/RecipeCard"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/useAuth"

interface UserProfile {
  username: string
  email: string
  isAdmin: boolean
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState(0)
  const navigate = useNavigate()
  const { logout } = useAuth()

  const savedRecipes = useDataLoader<RecipeCardProps[]>(
    "/api/user/saved-recipes"
  )
  const myRecipes = useDataLoader<RecipeCardProps[]>("/api/user/my-recipes")
  const userProfile = useDataLoader<UserProfile>("/api/user/profile")

  // If auth is no longer valid, redirect to login (ProtectedRoute should normally catch this,
  // but this is a defensive fallback for mid-session expiry).
  useEffect(() => {
    if (
      savedRecipes.response?.status === 401 ||
      savedRecipes.response?.status === 403 ||
      myRecipes.response?.status === 401 ||
      myRecipes.response?.status === 403 ||
      userProfile.response?.status === 401 ||
      userProfile.response?.status === 403
    ) {
      logout()
        .catch(() => {})
        .finally(() => {
          navigate("/login", { replace: true, state: { returnTo: "/profile" } })
        })
    }
  }, [
    savedRecipes.response,
    myRecipes.response,
    userProfile.response,
    logout,
    navigate,
  ])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
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
