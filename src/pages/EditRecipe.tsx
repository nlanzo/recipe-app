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
} from "@mui/material"
import Grid from "@mui/material/Grid2"
import { TiDelete } from "react-icons/ti"
import { useNavigate, useParams } from "react-router-dom"
import { useDataLoader } from "../components/useDataLoader"

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

  const navigate = useNavigate()

  const { id } = useParams<{ id: string }>()

  const data = useDataLoader<RecipeDetails>(
    `http://localhost:3000/api/recipes/${id}`
  )

  // Pre-populate the form fields with the recipe data
  useEffect(() => {
    if (data.data) {
      setTitle(data.data.title || "")
      setDescription(data.data.description || "")
      setInstructions(data.data.instructions || "")
      setActiveTimeInMinutes(data.data.activeTimeInMinutes)
      setTotalTimeInMinutes(data.data.totalTimeInMinutes)
      setNumberOfServings(data.data.numberOfServings)
      setIngredients(data.data.ingredients)
      setImages(data.data.images)
      setCategories(data.data.categories)
    }
  }, [data.data])

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

  const handleSubmit = async () => {
    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("instructions", instructions)
    formData.append("activeTimeInMinutes", activeTimeInMinutes.toString())
    formData.append("totalTimeInMinutes", totalTimeInMinutes.toString())
    formData.append("numberOfServings", numberOfServings.toString())
    // Convert categories to JSON string
    formData.append("categories", JSON.stringify(categories))
    // Convert ingredients to JSON string
    formData.append("ingredients", JSON.stringify(ingredients))
    const maxFileSize = 5 * 1024 * 1024 // 5 MB
    for (const image of newImages) {
      if (image.size > maxFileSize) {
        setError(`File ${image.name} is too large. Maximum size is 5 MB.`)
        return
      }
      formData.append("newImages", image)
    }

    // Submit recipe to the server
    try {
      const response = await fetch(`http://localhost:3000/api/recipes/${id}`, {
        method: "PUT",
        body: formData,
      })
      if (response.ok) {
        alert("Recipe edited successfully!")
        // Navigate to the newly added recipe's details page
        navigate(`/recipes/${id}`)
      } else {
        alert("Failed to edit recipe.")
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
                    value={activeTimeInMinutes}
                    onChange={(e) =>
                      setActiveTimeInMinutes(Number(e.target.value) || "")
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    label="Total Time (minutes)"
                    type="number"
                    value={totalTimeInMinutes}
                    onChange={(e) =>
                      setTotalTimeInMinutes(Number(e.target.value) || "")
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <TextField
                    label="Servings"
                    type="number"
                    value={numberOfServings}
                    onChange={(e) =>
                      setNumberOfServings(Number(e.target.value) || "")
                    }
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
                {error ?? <Typography>{error}</Typography>}
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
