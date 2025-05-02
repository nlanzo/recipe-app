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
  const navigate = useNavigate()

  // Validation helpers
  const getFieldError = (value: string | number | string[] | ""): boolean => {
    if (!hasAttemptedSubmit) return false
    return !value || (Array.isArray(value) && value.length === 0)
  }

  const getHelperText = (
    fieldName: string,
    value: string | number | string[] | ""
  ): string => {
    if (!hasAttemptedSubmit) return ""
    return getFieldError(value) ? `${fieldName} is required` : ""
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

    // Validate required fields
    if (
      !title ||
      !description ||
      !instructions ||
      !activeTime ||
      !totalTime ||
      !servings ||
      categories.length === 0 ||
      ingredients.length === 0 ||
      images.length === 0
    ) {
      return
    }

    setIsSubmitting(true)
    setError(null)
    const formData = new FormData()
    // TODO: Add user authentication and get user ID
    formData.append("userId", "1") // Hardcoded user ID for now
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

    // Check file sizes and append images
    const maxFileSize = 5 * 1024 * 1024 // 5 MB
    for (const image of images) {
      if (image.size > maxFileSize) {
        setError(`File ${image.name} is too large. Maximum size is 5 MB.`)
        return
      }
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
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                error={getFieldError(title)}
                helperText={getHelperText("Title", title)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
                error={getFieldError(description)}
                helperText={getHelperText("Description", description)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                fullWidth
                multiline
                rows={4}
                error={getFieldError(instructions)}
                helperText={getHelperText("Instructions", instructions)}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Active Time (minutes)"
                type="number"
                value={activeTime}
                onChange={(e) => setActiveTime(Number(e.target.value) || "")}
                fullWidth
                error={getFieldError(activeTime)}
                helperText={getHelperText("Active time", activeTime)}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Total Time (minutes)"
                type="number"
                value={totalTime}
                onChange={(e) => setTotalTime(Number(e.target.value) || "")}
                fullWidth
                error={getFieldError(totalTime)}
                helperText={getHelperText("Total time", totalTime)}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value) || "")}
                fullWidth
                error={getFieldError(servings)}
                helperText={getHelperText("Servings", servings)}
              />
            </Grid>

            {/* Categories */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth error={getFieldError(categories)}>
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={categories}
                  onChange={(e) =>
                    setCategories(
                      typeof e.target.value === "string"
                        ? e.target.value.split(",")
                        : e.target.value
                    )
                  }
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
                {getFieldError(categories) && (
                  <FormHelperText>
                    Please select at least one category
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
              {hasAttemptedSubmit && ingredients.length === 0 && (
                <Typography color="error" variant="caption">
                  Please add at least one ingredient
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
                      hasAttemptedSubmit && images.length === 0
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
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                  style={{ width: "100%" }}
                />
              </Box>
              {hasAttemptedSubmit && images.length === 0 && (
                <Typography color="error" variant="caption">
                  Please upload at least one image
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
