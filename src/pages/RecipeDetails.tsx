import { useState } from "react"
import {
  Box,
  Typography,
  Button,
  CardMedia,
  Stack,
  Divider,
  Grid,
} from "@mui/material"
import { useParams, Navigate } from "react-router-dom"
import { useDataLoader } from "../components/useDataLoader"
import DeleteRecipeButton from "../components/DeleteRecipeButton"
import EditRecipeButton from "../components/EditRecipeButton"
import SaveRecipeButton from "../components/SaveRecipeButton"
import { useAuth } from "../contexts/useAuth"

interface RecipeDetails {
  title: string
  author: string | null
  userId: number
  categories: string[]
  images: { imageUrl: string; altText: string | null }[]
  description: string | null
  activeTimeInMinutes: number
  totalTimeInMinutes: number
  numberOfServings: number
  ingredients: {
    name: string | null
    quantity: string
    unit: string | null
  }[]
  instructions: string | null
}

export default function RecipeDetails() {
  const { id } = useParams()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const data = useDataLoader<RecipeDetails>(`/api/recipes/${id}`)
  const { user: currentUser } = useAuth()

  // Handle 404 case - recipe not found
  if (!data.isLoading && data.data && !data.data.title) {
    return <Navigate to="/not-found" replace />
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      data.data && data.data.images
        ? (prevIndex + 1) % data.data.images.length
        : 0
    )
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => {
      if (data.data && data.data.images) {
        return (
          (prevIndex - 1 + data.data.images.length) % data.data.images.length
        )
      }
      return 0
    })
  }

  return (
    <div>
      {!data.isLoading ? (
        <Box sx={{ padding: 4 }}>
          {data.error ? (
            <Typography color="error">{data.error}</Typography>
          ) : null}
          {/* Recipe Title */}
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
            {data.data?.title}
          </Typography>

          {/* Author */}
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            By {data.data?.author}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Image and Description Layout */}
          <Grid container spacing={4}>
            {/* Image Carousel */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: "relative",
                  mb: 4,
                  // Fixed widths at different breakpoints
                  width: {
                    xs: "100%", // Full width on mobile
                    sm: "450px", // Slightly wider on small screens
                    md: "500px", // Wider on medium screens
                    lg: "550px", // Even wider on big screens
                  },
                  // Create a 16:9 aspect ratio container
                  "&::before": {
                    content: '""',
                    display: "block",
                    paddingTop: "56.25%", // 9/16 = 0.5625
                  },
                }}
              >
                <CardMedia
                  component="img"
                  image={data.data?.images[currentImageIndex].imageUrl}
                  alt={
                    data.data?.images[currentImageIndex].altText ||
                    "Recipe image"
                  }
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 2,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    transform: "none",
                  }}
                >
                  <Button
                    onClick={handlePrevImage}
                    variant="contained"
                    size="small"
                    sx={{
                      minWidth: "32px",
                      width: "32px",
                      height: "32px",
                      padding: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                      },
                    }}
                  >
                    {"<"}
                  </Button>
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    transform: "none",
                  }}
                >
                  <Button
                    onClick={handleNextImage}
                    variant="contained"
                    size="small"
                    sx={{
                      minWidth: "32px",
                      width: "32px",
                      height: "32px",
                      padding: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                      },
                    }}
                  >
                    {">"}
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Description */}
            <Grid item xs={12} md={6}>
              <Typography variant="body1" gutterBottom>
                {data.data?.description}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Recipe Details */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="subtitle2">Active Time:</Typography>
              <Typography>{data.data?.activeTimeInMinutes} minutes</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2">Total Time:</Typography>
              <Typography>{data.data?.totalTimeInMinutes} minutes</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="subtitle2">Servings:</Typography>
              <Typography>{data.data?.numberOfServings}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Ingredients */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Ingredients
            </Typography>
            <Stack spacing={1}>
              {data.data?.ingredients.map((ingredient, index) => (
                <Typography key={index} variant="body1">
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </Typography>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Instructions */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            <Typography variant="body1">{data.data?.instructions}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            {(data.data?.userId === currentUser?.id ||
              currentUser?.isAdmin) && (
              <>
                <EditRecipeButton id={id!} />
                <DeleteRecipeButton id={id!} />
              </>
            )}
            <SaveRecipeButton recipeId={id!} />
          </Box>
        </Box>
      ) : (
        <Typography variant="h4">Loading...</Typography>
      )}
    </div>
  )
}
