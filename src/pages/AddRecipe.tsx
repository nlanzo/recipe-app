import React, { useState } from "react"
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
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { TiDelete } from "react-icons/ti"
import { useNavigate } from "react-router-dom"

const AddRecipe: React.FC = () => {
  // State management
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
    // categories.forEach((category) => formData.append("categories", category))
    // ingredients.forEach((ingredient, index) => {
    //   formData.append(`ingredients[${index}][name]`, ingredient.name)
    //   formData.append(`ingredients[${index}][quantity]`, ingredient.quantity)
    //   formData.append(`ingredients[${index}][unit]`, ingredient.unit)
    // })
    // images.forEach((image) => formData.append("images", image))

    // Submit recipe to the server
    try {
      const response = await fetch("http://localhost:3000/api/recipes", {
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
        alert("Failed to add recipe.")
      }
    } catch (error) {
      console.error("Error adding recipe:", error)
      alert("Error adding recipe.")
    }
  }

  return (
    <Box sx={{ padding: 4, maxWidth: "800px", margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
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
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Active Time (minutes)"
                type="number"
                value={activeTime}
                onChange={(e) => setActiveTime(Number(e.target.value) || "")}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Total Time (minutes)"
                type="number"
                value={totalTime}
                onChange={(e) => setTotalTime(Number(e.target.value) || "")}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                label="Servings"
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value) || "")}
                fullWidth
              />
            </Grid>

            {/* Categories */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
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
            </Grid>

            {/* Images */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6">Upload Images</Typography>
              <input
                type="file"
                multiple
                onChange={(e) => setImages(Array.from(e.target.files || []))}
              />
              {error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}
            </Grid>

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddRecipe}
              >
                Submit Recipe
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AddRecipe
