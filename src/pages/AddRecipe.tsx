import { useState } from "react"
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
  FormHelperText,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { TiDelete } from "react-icons/ti"
import { FaSpinner } from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import { authenticatedFetch } from "../utils/api"
import { z } from "zod"

export default function AddRecipe() {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [activeTime, setActiveTime] = useState<number | "">("")
  const [totalTime, setTotalTime] = useState<number | "">("")
  const [servings, setServings] = useState<number | "">("")
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
  const [ingredients, setIngredients] = useState<
    { name: string; quantity: string; unit: string }[]
  >([])
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "",
  })
  const [images, setImages] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  // Zod validation schema
  const recipeSchema = z.object({
    title: z.string().min(1, "Title is required").max(255, "Title must be 255 characters or less"),
    description: z.string().min(1, "Description is required"),
    instructions: z.string().min(1, "Instructions are required"),
    activeTime: z.number().min(1, "Active time must be at least 1 minute"),
    totalTime: z.number().min(1, "Total time must be at least 1 minute"),
    servings: z.number().min(1, "Servings must be at least 1"),
    categories: z.array(z.string()).min(1, "At least one category is required"),
    ingredients: z.array(z.object({
      name: z.string().min(1, "Ingredient name is required"),
      quantity: z.string().min(1, "Quantity is required"),
      unit: z.string().min(1, "Unit is required"),
    })).min(1, "At least one ingredient is required"),
    images: z.array(z.instanceof(File)).min(1, "At least one image is required"),
  })

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
        activeTime: typeof activeTime === "number" ? activeTime : 0,
        totalTime: typeof totalTime === "number" ? totalTime : 0,
        servings: typeof servings === "number" ? servings : 0,
        categories,
        ingredients,
        images,
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

  const handleAddRecipe = async () => {
    setHasAttemptedSubmit(true)

    // Validate using Zod schema
    if (!validateForm()) {
      return
    }

    // Additional file size validation
    const maxFileSize = 5 * 1024 * 1024 // 5 MB
    for (const image of images) {
      if (image.size > maxFileSize) {
        setError(`File ${image.name} is too large. Maximum size is 5 MB.`)
        setFieldErrors({ ...fieldErrors, images: "File size must be 5 MB or less" })
        return
      }
    }

    setIsSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("instructions", instructions)
    formData.append("activeTime", activeTime.toString())
    formData.append("totalTime", totalTime.toString())
    formData.append("servings", servings.toString())
    // Convert categories to JSON string
    formData.append("categories", JSON.stringify(categories))

    // Convert ingredients to JSON string
    formData.append("ingredients", JSON.stringify(ingredients))

    // Append images (file size already validated)
    for (const image of images) {
      formData.append("images", image)
    }

    // Submit recipe to the server
    try {
      const response = await authenticatedFetch("/api/recipes", {
        method: "POST",
        body: formData,
      })
      if (response.ok) {
        const data = await response.json()
        const recipeId = data.id
        alert("Recipe added successfully!")
        // Clear form
        setTitle("")
        setDescription("")
        setInstructions("")
        setActiveTime("")
        setTotalTime("")
        setServings("")
        setCategories([])
        setIngredients([])
        setImages([])
        // Navigate to the newly added recipe's details page
        navigate(`/recipes/${recipeId}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to add recipe.")
        alert("Failed to add recipe. " + (errorData.error || ""))
      }
    } catch (error) {
      console.error("Error adding recipe:", error)
      alert("Error adding recipe.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box sx={{ padding: 4, maxWidth: "800px", margin: "0 auto" }}>
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
        Add a New Recipe
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
                value={activeTime}
                onChange={(e) => {
                  setActiveTime(Number(e.target.value) || "")
                  if (hasAttemptedSubmit) validateForm()
                }}
                fullWidth
                error={!!getFieldError("activeTime")}
                helperText={getFieldError("activeTime")}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Total Time (minutes)"
                type="number"
                value={totalTime}
                onChange={(e) => {
                  setTotalTime(Number(e.target.value) || "")
                  if (hasAttemptedSubmit) validateForm()
                }}
                fullWidth
                error={!!getFieldError("totalTime")}
                helperText={getFieldError("totalTime")}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Servings"
                type="number"
                value={servings}
                onChange={(e) => {
                  setServings(Number(e.target.value) || "")
                  if (hasAttemptedSubmit) validateForm()
                }}
                fullWidth
                error={!!getFieldError("servings")}
                helperText={getFieldError("servings")}
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
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
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

            {/* Images */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom>
                Upload Images
              </Typography>
              <Box
                sx={{
                  border: (theme) =>
                    `1px solid ${
                      getFieldError("images")
                        ? theme.palette.error.main
                        : theme.palette.divider
                    }`,
                  borderRadius: 1,
                  p: 2,
                  mb: 1,
                }}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    setImages(Array.from(e.target.files || []))
                    if (hasAttemptedSubmit) validateForm()
                  }}
                  style={{ width: "100%" }}
                />
              </Box>
              {getFieldError("images") && (
                <Typography color="error" variant="caption">
                  {getFieldError("images")}
                </Typography>
              )}
              {images.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    Selected images: {images.map((img) => img.name).join(", ")}
                  </Typography>
                </Box>
              )}
            </Grid>

            {/* Error Message - only show for file size errors */}
            {error && error.includes("too large") && (
              <Grid size={{ xs: 12 }}>
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </Grid>
            )}

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddRecipe}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    Adding Recipe... <FaSpinner />
                  </>
                ) : (
                  "Submit Recipe"
                )}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}
