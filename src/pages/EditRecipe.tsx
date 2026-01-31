import { useEffect, useState } from "react"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Paper,
  FormHelperText,
  CircularProgress,
  Alert,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { TiDelete } from "react-icons/ti"
import { FaSpinner } from "react-icons/fa"
import { useNavigate, useParams } from "react-router-dom"
import { useDataLoader } from "../components/useDataLoader"
import { authenticatedFetch } from "../utils/api"
import { z } from "zod"

interface RecipeDetails {
  title: string
  author: string | null
  categories: string[]
  description: string | null
  images: { imageUrl: string; altText: string | null }[]
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

export default function EditRecipe() {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [activeTimeInMinutes, setActiveTimeInMinutes] = useState<number | "">(
    ""
  )
  const [totalTimeInMinutes, setTotalTimeInMinutes] = useState<number | "">("")
  const [numberOfServings, setNumberOfServings] = useState<number | "">("")
  const [categories, setCategories] = useState<string[]>([])
  const categoryOptions = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Dessert",
    "Snacks",
    "Beverage",
    "Side Dish",
    "Main Course",
  ]
  const [ingredients, setIngredients] = useState<RecipeDetails["ingredients"]>(
    []
  )
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "",
  })
  const [images, setImages] = useState<
    { imageUrl: string; altText: string | null }[]
  >([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [removedImages, setRemovedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const navigate = useNavigate()

  const { id } = useParams<{ id: string }>()

  // Use the useDataLoader hook to fetch the recipe data
  const {
    data: recipeData,
    error: loadError,
    isLoading,
  } = useDataLoader<RecipeDetails>(`/api/recipes/${id}`)

  // Zod validation schema
  const recipeSchema = z.object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or less"),
    description: z.string().min(1, "Description is required"),
    instructions: z.string().min(1, "Instructions are required"),
    activeTimeInMinutes: z.number().min(1, "Active time must be at least 1 minute"),
    totalTimeInMinutes: z
      .number()
      .min(1, "Total time must be at least 1 minute"),
    numberOfServings: z.number().min(1, "Servings must be at least 1"),
    categories: z.array(z.string()).min(1, "At least one category is required"),
    ingredients: z
      .array(
        z.object({
          name: z.string().nullable(),
          quantity: z.string().min(1, "Quantity is required"),
          unit: z.string().nullable(),
        })
      )
      .min(1, "At least one ingredient is required"),
  })

  // Pre-populate the form fields with the recipe data
  useEffect(() => {
    if (recipeData) {
      setTitle(recipeData.title || "")
      setDescription(recipeData.description || "")
      setInstructions(recipeData.instructions || "")
      setActiveTimeInMinutes(recipeData.activeTimeInMinutes)
      setTotalTimeInMinutes(recipeData.totalTimeInMinutes)
      setNumberOfServings(recipeData.numberOfServings)
      setIngredients(recipeData.ingredients)
      setImages(recipeData.images)
      setCategories(recipeData.categories)
    }
  }, [recipeData])

  // Handle API errors from the useDataLoader hook
  useEffect(() => {
    if (loadError) {
      setApiError(loadError)
    }
  }, [loadError])

  // Handlers
  const handleAddIngredient = () => {
    if (newIngredient.name && newIngredient.quantity && newIngredient.unit) {
      setIngredients((prev) => [...prev, newIngredient])
      setNewIngredient({ name: "", quantity: "", unit: "" })
    }
  }

  const handleDeleteIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewImages([...newImages, ...Array.from(e.target.files)])
    }
  }

  const handleRemoveImage = (index: number, isNew: boolean) => {
    if (isNew) {
      setNewImages(newImages.filter((_, i) => i !== index))
    } else {
      const removedImageUrl = images[index].imageUrl
      setRemovedImages([...removedImages, removedImageUrl])
      setImages(images.filter((_, i) => i !== index))
    }
  }

  // Validation helpers
  const getFieldError = (fieldName: string): string => {
    if (!hasAttemptedSubmit) return ""
    return fieldErrors[fieldName] || ""
  }

  const validateForm = (): boolean => {
    try {
      recipeSchema.parse({
        title,
        description,
        instructions,
        activeTimeInMinutes:
          typeof activeTimeInMinutes === "number" ? activeTimeInMinutes : 0,
        totalTimeInMinutes:
          typeof totalTimeInMinutes === "number" ? totalTimeInMinutes : 0,
        numberOfServings:
          typeof numberOfServings === "number" ? numberOfServings : 0,
        categories,
        ingredients,
      })
      setFieldErrors({})
      return true
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        err.errors.forEach((error) => {
          const path = error.path.join(".")
          errors[path] = error.message
        })
        setFieldErrors(errors)
      }
      return false
    }
  }

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true)
    setApiError(null) // Clear any previous API errors

    // Validate using Zod schema
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("instructions", instructions)
    formData.append("activeTimeInMinutes", activeTimeInMinutes.toString())
    formData.append("totalTimeInMinutes", totalTimeInMinutes.toString())
    formData.append("numberOfServings", numberOfServings.toString())
    formData.append("categories", JSON.stringify(categories))
    formData.append("ingredients", JSON.stringify(ingredients))
    formData.append("removedImages", JSON.stringify(removedImages))

    // Additional file size validation for new images
    const maxFileSize = 5 * 1024 * 1024 // 5 MB
    for (const image of newImages) {
      if (image.size > maxFileSize) {
        setError(`File ${image.name} is too large. Maximum size is 5 MB.`)
        setIsSubmitting(false)
        return
      }
      formData.append("newImages", image)
    }

    try {
      const response = await authenticatedFetch(`/api/recipes/${id}`, {
        method: "PUT",
        body: formData,
      })

      if (response.ok) {
        alert("Recipe edited successfully!")
        navigate(`/recipes/${id}`)
      } else {
        const errorData = await response.json()
        if (errorData.error === "Validation failed" && errorData.details) {
          // Handle validation errors from the server
          const errorMessages = errorData.details
            .map((err: { field: string; message: string }) => `${err.message}`)
            .join("\n")
          setError(errorMessages)
        } else {
          setApiError(errorData.error || "Failed to edit recipe.")
        }
      }
    } catch (error) {
      console.error("Error editing recipe:", error)
      setApiError("Network error. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ padding: 4, maxWidth: "800px", margin: "0 auto" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}

          <Typography
            component="h2"
            sx={{
              fontSize: { xs: "2rem", md: "3rem" },
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 4,
              color: "secondary.main",
            }}
          >
            Edit Recipe
          </Typography>

          <Card>
            <CardContent>
              <Grid container spacing={3}>
                {/* Recipe Details */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (hasAttemptedSubmit) validateForm()
                    }}
                    fullWidth
                    error={!!getFieldError("title")}
                    helperText={getFieldError("title")}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      if (hasAttemptedSubmit) validateForm()
                    }}
                    fullWidth
                    multiline
                    rows={3}
                    error={!!getFieldError("description")}
                    helperText={getFieldError("description")}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Instructions"
                    value={instructions}
                    onChange={(e) => {
                      setInstructions(e.target.value)
                      if (hasAttemptedSubmit) validateForm()
                    }}
                    fullWidth
                    multiline
                    rows={4}
                    error={!!getFieldError("instructions")}
                    helperText={getFieldError("instructions")}
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    label="Active Time (minutes)"
                    type="number"
                    value={activeTimeInMinutes}
                    onChange={(e) => {
                      setActiveTimeInMinutes(Number(e.target.value) || "")
                      if (hasAttemptedSubmit) validateForm()
                    }}
                    fullWidth
                    error={!!getFieldError("activeTimeInMinutes")}
                    helperText={getFieldError("activeTimeInMinutes")}
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    label="Total Time (minutes)"
                    type="number"
                    value={totalTimeInMinutes}
                    onChange={(e) => {
                      setTotalTimeInMinutes(Number(e.target.value) || "")
                      if (hasAttemptedSubmit) validateForm()
                    }}
                    fullWidth
                    error={!!getFieldError("totalTimeInMinutes")}
                    helperText={getFieldError("totalTimeInMinutes")}
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    label="Servings"
                    type="number"
                    value={numberOfServings}
                    onChange={(e) => {
                      setNumberOfServings(Number(e.target.value) || "")
                      if (hasAttemptedSubmit) validateForm()
                    }}
                    fullWidth
                    error={!!getFieldError("numberOfServings")}
                    helperText={getFieldError("numberOfServings")}
                  />
                </Grid>

                {/* Categories */}
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth error={!!getFieldError("categories")}>
                    <InputLabel>Categories</InputLabel>
                    <Select
                      multiple
                      value={categories}
                      onChange={(e) => {
                        setCategories(
                          typeof e.target.value === "string"
                            ? e.target.value.split(",")
                            : e.target.value
                        )
                        if (hasAttemptedSubmit) validateForm()
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {categoryOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                    {getFieldError("categories") && (
                      <FormHelperText>
                        {getFieldError("categories")}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Ingredients */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6">Ingredients</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        label="Name"
                        value={newIngredient.name}
                        onChange={(e) =>
                          setNewIngredient((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <TextField
                        label="Quantity"
                        type="number"
                        value={newIngredient.quantity}
                        onChange={(e) =>
                          setNewIngredient((prev) => ({
                            ...prev,
                            quantity: e.target.value,
                          }))
                        }
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel>Unit</InputLabel>
                        <Select
                          label="Unit"
                          value={newIngredient.unit}
                          onChange={(e) =>
                            setNewIngredient((prev) => ({
                              ...prev,
                              unit: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="cups">cups</MenuItem>
                          <MenuItem value="tablespoons">Tbsp</MenuItem>
                          <MenuItem value="teaspoons">tsp</MenuItem>
                          <MenuItem value="ounces">oz</MenuItem>
                          <MenuItem value="pounds">lb</MenuItem>
                          <MenuItem value="grams">g</MenuItem>
                          <MenuItem value="kilograms">kg</MenuItem>
                          <MenuItem value="milliliters">mL</MenuItem>
                          <MenuItem value="liters">L</MenuItem>
                          <MenuItem value="pieces">pieces</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Button variant="outlined" onClick={handleAddIngredient}>
                        Add Ingredient
                      </Button>
                    </Grid>
                  </Grid>
                  <Box mt={2}>
                    {ingredients.map((ingredient, index) => (
                      <Typography key={index}>
                        {ingredient.quantity} {ingredient.unit}{" "}
                        {ingredient.name}
                        <Button>
                          <TiDelete
                            size="1rem"
                            onClick={() => handleDeleteIngredient(index)}
                            color="red"
                          />
                        </Button>
                      </Typography>
                    ))}
                  </Box>
                  {getFieldError("ingredients") && (
                    <Typography color="error" variant="caption">
                      {getFieldError("ingredients")}
                    </Typography>
                  )}
                </Grid>
                <Typography variant="h6" marginTop={2}>
                  Images
                </Typography>
                <Grid container spacing={2}>
                  {/* Existing Images */}
                  {images.map((image, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                      <Paper
                        style={{
                          padding: 10,
                          textAlign: "center",
                          position: "relative",
                        }}
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.altText || "Recipe Image"}
                          style={{ maxWidth: "100%", height: "auto" }}
                        />
                        <Button
                          onClick={() => handleRemoveImage(index, false)}
                          variant="outlined"
                          color="error"
                        >
                          Remove Image
                        </Button>
                      </Paper>
                    </Grid>
                  ))}

                  {/* New Images */}
                  {newImages.map((file, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`new-${index}`}>
                      <Paper
                        style={{
                          padding: 10,
                          textAlign: "center",
                          position: "relative",
                        }}
                      >
                        <Typography>{file.name}</Typography>
                        <Button
                          onClick={() => handleRemoveImage(index, true)}
                          variant="outlined"
                          color="error"
                        >
                          Remove
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Button
                  variant="contained"
                  component="label"
                  style={{ marginTop: 10 }}
                >
                  Add Images
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleAddImage}
                  />
                </Button>
                {/* Submit Button */}
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        Saving Changes... <FaSpinner />
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </div>
  )
}
