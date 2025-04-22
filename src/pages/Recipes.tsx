import { useState, useEffect, useCallback } from "react"
import {
  Container,
  Grid,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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

interface RecipeResponse {
  recipes: Recipe[]
  pagination: {
    total: number
    hasMore: boolean
    currentPage: number
    totalPages: number
  }
}

type SortOption = "" | "title" | "time"

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 500)

  const fetchRecipes = useCallback(
    async (page: number = 1, isLoadingMore = false) => {
      if (!isLoadingMore) {
        setLoading(true)
      }
      try {
        // Build URL parameters
        const params = new URLSearchParams()
        params.append("page", String(page))
        if (sortBy) params.append("sort", sortBy)

        // Choose endpoint and add search query if needed
        const url = debouncedSearch
          ? `/api/recipes/search?${params.toString()}&query=${encodeURIComponent(
              debouncedSearch
            )}`
          : `/api/recipes?${params.toString()}`

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error("Failed to fetch recipes")
        }
        const data: RecipeResponse = await response.json()
        if (isLoadingMore) {
          setRecipes((prev) => [...prev, ...data.recipes])
        } else {
          setRecipes(data.recipes)
        }
        setCurrentPage(data.pagination.currentPage)
        setHasMore(data.pagination.hasMore)
        setError("")
      } catch (err) {
        setError("Failed to load recipes")
        console.error("Error fetching recipes:", err)
      } finally {
        setLoading(false)
        setIsLoadingMore(false)
      }
    },
    [debouncedSearch, sortBy]
  )

  useEffect(() => {
    setCurrentPage(1)
    fetchRecipes(1)
  }, [debouncedSearch, sortBy, fetchRecipes])

  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop ===
      document.documentElement.offsetHeight
    ) {
      if (hasMore && !isLoadingMore && !loading) {
        setIsLoadingMore(true)
        fetchRecipes(currentPage + 1, true)
      }
    }
  }, [hasMore, isLoadingMore, loading, currentPage, fetchRecipes])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

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
        <Grid container spacing={2}>
          <Grid item xs={8}>
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
          </Grid>
          <Grid item xs={4}>
            <FormControl fullWidth>
              <InputLabel id="sort-select-label">Sort By</InputLabel>
              <Select
                labelId="sort-select-label"
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="time">Prep Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Typography color="error" align="center" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading && recipes.length === 0 ? (
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
        <>
          <Grid container spacing={4}>
            {recipes?.map((recipe, index) => (
              <Grid item key={`${recipe.id}-${index}`} xs={12} sm={6} md={4}>
                <RecipeCard
                  id={recipe.id}
                  title={recipe.title}
                  imageUrl={recipe.imageUrl}
                  totalTimeInMinutes={recipe.totalTimeInMinutes}
                  numberOfServings={recipe.numberOfServings}
                />
              </Grid>
            ))}
            {(!recipes || recipes.length === 0) && !loading && (
              <Grid item xs={12}>
                <Typography align="center" color="textSecondary">
                  {searchQuery
                    ? "No recipes found matching your search."
                    : "No recipes available."}
                </Typography>
              </Grid>
            )}
          </Grid>
          {isLoadingMore && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </>
      )}
    </Container>
  )
}
