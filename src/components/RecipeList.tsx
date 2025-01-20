import Grid from "@mui/material/Grid2"
import { Box, Typography, Button, ButtonGroup, Pagination } from "@mui/material"
import RecipeCard from "./RecipeCard"
import { useDataLoader } from "./useDataLoader"
import { useState } from "react"

interface Recipe {
  id: number
  title: string
  imageUrl: string | null
  totalTimeInMinutes: number
  numberOfServings: number
}

export default function RecipeList() {
  const data = useDataLoader<Recipe[]>("http://localhost:3000/api/recipes")
  const [sortBy, setSortBy] = useState<"title" | "time">("title")
  const [page, setPage] = useState(1)
  const recipesPerPage = 6

  if (data.isLoading) {
    return <Typography>Loading...</Typography>
  }

  const sortedRecipes = data.data?.sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title)
    } else {
      return a.totalTimeInMinutes - b.totalTimeInMinutes
    }
  })

  // Calculate pagination
  const totalPages = Math.ceil((sortedRecipes?.length || 0) / recipesPerPage)
  const paginatedRecipes = sortedRecipes?.slice(
    (page - 1) * recipesPerPage,
    page * recipesPerPage
  )

  return (
    <Box sx={{ p: 2, maxWidth: "xl", mx: "auto" }}>
      {data.error ? (
        <Typography color="error">{data.error}</Typography>
      ) : (
        <>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <ButtonGroup variant="contained">
              <Button
                onClick={() => setSortBy("title")}
                variant={sortBy === "title" ? "contained" : "outlined"}
              >
                Sort by Title
              </Button>
              <Button
                onClick={() => setSortBy("time")}
                variant={sortBy === "time" ? "contained" : "outlined"}
              >
                Sort by Prep Time
              </Button>
            </ButtonGroup>
          </Box>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="stretch"
          >
            {paginatedRecipes?.map((recipe) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4 }}
                key={recipe.id}
                className="flex"
              >
                <RecipeCard {...recipe} />
              </Grid>
            ))}
          </Grid>
          {totalPages > 1 && (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
