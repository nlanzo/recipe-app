import { useState } from "react"
import {
  Box,
  Typography,
  Button,
  CardMedia,
  Stack,
  Divider,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { useParams } from "react-router-dom"
import { useDataLoader } from "../components/useDataLoader"
import DeleteRecipeButton from "../components/DeleteRecipeButton"
import EditRecipeButton from "../components/EditRecipeButton"
import SaveRecipeButton from "../components/SaveRecipeButton"

interface RecipeDetails {
  name: string
  author: string | null
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
          <Typography variant="h4" gutterBottom>
            {data.data?.name}
          </Typography>

          {/* Author */}
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            By {data.data?.author}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Image Carousel */}
          <Box sx={{ position: "relative", mb: 4 }}>
            <CardMedia
              component="img"
              image={data.data?.images[currentImageIndex].imageUrl}
              alt={
                data.data?.images[currentImageIndex].altText || "Recipe image"
              }
              sx={{
                width: "100%",
                maxHeight: "400px",
                objectFit: "cover",
                borderRadius: 2,
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: 0,
                transform: "translateY(-50%)",
              }}
            >
              <Button onClick={handlePrevImage} variant="contained">
                {"<"}
              </Button>
            </Box>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                right: 0,
                transform: "translateY(-50%)",
              }}
            >
              <Button onClick={handleNextImage} variant="contained">
                {">"}
              </Button>
            </Box>
          </Box>

          {/* Description */}
          <Typography variant="body1" gutterBottom>
            {data.data?.description}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Recipe Details */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <Typography variant="subtitle2">Active Time:</Typography>
              <Typography>{data.data?.activeTimeInMinutes} minutes</Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="subtitle2">Total Time:</Typography>
              <Typography>{data.data?.totalTimeInMinutes} minutes</Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
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
            <EditRecipeButton id={id!} />
            <DeleteRecipeButton id={id!} />
            <SaveRecipeButton recipeId={id!} />
          </Box>
        </Box>
      ) : (
        <Typography variant="h4">Loading...</Typography>
      )}
    </div>
  )
}
