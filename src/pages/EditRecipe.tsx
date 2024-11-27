import { useEffect, useState } from "react"
import {
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  InputLabel,
  MenuItem,
  Select,
  FormControl,
  Chip,
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { useNavigate, useParams } from "react-router-dom"
import { useDataLoader } from "../components/useDataLoader"

interface RecipeDetails {
  name: string
  author: string | null
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

export default function EditRecipe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [instructions, setInstructions] = useState("")
  const [activeTime, setActiveTime] = useState<number>(0)
  const [totalTime, setTotalTime] = useState<number>(0)
  const [servings, setServings] = useState<number>(0)
  const [categories, setCategories] = useState<string[]>([])
  const [ingredients, setIngredients] = useState<RecipeDetails["ingredients"]>(
    []
  )
  const [newCategory, setNewCategory] = useState<string>("")

  const data = useDataLoader<RecipeDetails>(
    `http://localhost:3000/api/recipes/${id}`
  )
  // Pre-populate the form fields with the recipe data
  setTitle(data.data.title)
  setDescription(data.data.description)
  setInstructions(data.data.instructions)
  setActiveTime(data.data.activeTime)
  setTotalTime(data.data.totalTime)
  setServings(data.data.servings)
  setCategories(data.data.categories)
  setIngredients(data.data.ingredients)

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory])
      setNewCategory("")
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(
      categories.filter((category) => category !== categoryToRemove)
    )
  }

  const handleUpdateIngredient = (
    index: number,
    key: keyof RecipeDetails["ingredients"][number],
    value: string
  ) => {
    const updatedIngredients = [...ingredients]
    updatedIngredients[index][key] = value
    setIngredients(updatedIngredients)
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", unit: "", quantity: "0" }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!data) return

    try {
      const response = await fetch(`http://localhost:3000/api/recipes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update recipe")
      }

      alert("Recipe updated successfully!")
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    }
  }

  if (!data) {
    return <Typography>Loading...</Typography>
  }

  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Edit Recipe
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Title */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Title"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Grid>

            {/* Description */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>

            {/* Instructions */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Instructions"
                fullWidth
                multiline
                rows={5}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </Grid>

            {/* Active Time */}
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Active Time (minutes)"
                type="number"
                fullWidth
                value={activeTime}
                onChange={(e) => setActiveTime(Number(e.target.value))}
              />
            </Grid>

            {/* Total Time */}
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Total Time (minutes)"
                type="number"
                fullWidth
                value={totalTime}
                onChange={(e) => setTotalTime(Number(e.target.value))}
              />
            </Grid>

            {/* Servings */}
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Servings"
                type="number"
                fullWidth
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
            </Grid>

            {/* Categories */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Categories</InputLabel>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
                  {categories.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      onDelete={() => handleRemoveCategory(category)}
                    />
                  ))}
                </Box>
              </FormControl>
              <Box mt={2} display="flex" gap={2}>
                <TextField
                  label="New Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button variant="contained" onClick={handleAddCategory}>
                  Add Category
                </Button>
              </Box>
            </Grid>

            {/* Ingredients */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6">Ingredients</Typography>
              {ingredients.map((ingredient, index) => (
                <Box key={index} display="flex" gap={2} mb={2}>
                  <TextField
                    label="Name"
                    value={ingredient.name}
                    onChange={(e) =>
                      handleUpdateIngredient(index, "name", e.target.value)
                    }
                  />
                  <TextField
                    label="Quantity"
                    type="number"
                    value={ingredient.quantity}
                    onChange={(e) =>
                      handleUpdateIngredient(index, "quantity", e.target.value)
                    }
                  />
                  <TextField
                    label="Unit"
                    value={ingredient.unit}
                    onChange={(e) =>
                      handleUpdateIngredient(index, "unit", e.target.value)
                    }
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleRemoveIngredient(index)}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              <Button variant="contained" onClick={handleAddIngredient}>
                Add Ingredient
              </Button>
            </Grid>

            {/* Submit Button */}
            <Grid size={{ xs: 12 }}>
              <Button type="submit" variant="contained" color="primary">
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  )
}
