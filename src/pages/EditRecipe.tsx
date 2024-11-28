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
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { TiDelete } from "react-icons/ti"
import { useNavigate, useParams } from "react-router-dom"
import { useDataLoader } from "../components/useDataLoader"

interface RecipeDetails {
  name: string
  author: string | null
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

export default function AddRecipe() {
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
  const [ingredients, setIngredients] = useState<RecipeDetails["ingredients"]>(
    []
  )
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "",
  })
  const navigate = useNavigate()

  const { id } = useParams<{ id: string }>()

  const data = useDataLoader<RecipeDetails>(
    `http://localhost:3000/api/recipes/${id}`
  )

  // Pre-populate the form fields with the recipe data
  useEffect(() => {
    if (!data.isLoading && data.data) {
      setTitle(data.data.name)
      setDescription(data.data.description || "")
      setInstructions(data.data.instructions || "")
      setActiveTime(data.data.activeTimeInMinutes)
      setTotalTime(data.data.totalTimeInMinutes)
      setServings(data.data.numberOfServings)
      setIngredients(data.data.ingredients)
    }
  }, [data.isLoading, data.data])

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

  const handleSubmit = async () => {
    const formData = new FormData()
    // TODO: Add user authentication and get user ID
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

    // Submit recipe to the server
    try {
      const response = await fetch("http://localhost:3000/api/recipes", {
        method: "PUT",
        body: formData,
      })
      if (response.ok) {
        const data = await response.json()
        const recipeId = data.id
        alert("Recipe edited successfully!")
        // Navigate to the newly added recipe's details page
        navigate(`/recipes/${recipeId}`)
      } else {
        alert("Failed to add recipe.")
      }
    } catch (error) {
      console.error("Error editing recipe:", error)
      alert("Error editing recipe.")
    }
  }

  return (
    <div>
      {!data.isLoading ? (
        <Box sx={{ padding: 4, maxWidth: "800px", margin: "0 auto" }}>
          {data.error ? (
            <Typography color="error">{data.error}</Typography>
          ) : null}
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
                    onChange={(e) =>
                      setActiveTime(Number(e.target.value) || "")
                    }
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
                </Grid>
                {/* Submit Button */}
                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                  >
                    Submit Recipe
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Typography variant="h4">Loading...</Typography>
      )}
    </div>
  )
}
