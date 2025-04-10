import { useState, useEffect } from "react"
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import RecipeCard from "../components/RecipeCard"
import { useDebounce } from "../hooks/useDebounce"

interface Recipe {
  id: number
  title: string
  totalTimeInMinutes: number
  numberOfServings: number
  imageUrl: string | null
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true)
      try {
        const url = debouncedSearch
          ? `/api/recipes/search?query=${encodeURIComponent(debouncedSearch)}`
          : "/api/recipes"
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error("Failed to fetch recipes")
        }
        const data = await response.json()
        setRecipes(data)
        setError("")
      } catch (err) {
        setError("Failed to load recipes")
        console.error("Error fetching recipes:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecipes()
  }, [debouncedSearch])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
        Explore Recipes
      </Typography>

      <Box sx={{ maxWidth: 600, mx: "auto", mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {error && (
        <Typography color="error" align="center" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {recipes.map((recipe) => (
            <Grid item key={recipe.id} xs={12} sm={6} md={4}>
              <RecipeCard
                id={recipe.id}
                title={recipe.title}
                imageUrl={recipe.imageUrl}
                totalTimeInMinutes={recipe.totalTimeInMinutes}
                numberOfServings={recipe.numberOfServings}
              />
            </Grid>
          ))}
          {recipes.length === 0 && !loading && (
            <Grid item xs={12}>
              <Typography align="center" color="textSecondary">
                {searchQuery
                  ? "No recipes found matching your search."
                  : "No recipes available."}
              </Typography>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  )
}
