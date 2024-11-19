import { useEffect, useState } from "react"
import { getRecipeById } from "../db/recipeQueries"
import { useParams } from "react-router-dom"

interface RecipeDetails {
  title: string
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

export default function RecipeDetails() {
  const { id } = useParams()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [recipe, setRecipe] = useState<RecipeDetails | null>(null)

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const data = await getRecipeById(Number(id))
        setRecipe(data)
      } catch (err) {
        console.error(err)
      }
    }

    fetchRecipe()
  }, [id])

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      recipe ? (prevIndex > 0 ? prevIndex - 1 : recipe.images.length - 1) : 0
    )
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      recipe ? (prevIndex < recipe.images.length - 1 ? prevIndex + 1 : 0) : 0
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
      {/* Recipe Title */}
      <h1 className="text-4xl font-bold text-secondary mb-4">
        {recipe?.title}
      </h1>
      <p className="text-lg text-gray-600 mb-6">By {recipe?.author}</p>

      {/* Recipe Images */}
      <div className="relative w-full h-64 mb-6">
        {recipe && (
          <img
            src={recipe.images[currentImageIndex].imageUrl}
            alt={
              recipe.images[currentImageIndex].altText ||
              `Recipe image ${currentImageIndex + 1}`
            }
            className="w-full h-full object-cover rounded-lg"
          />
        )}
        <button
          onClick={handlePrevImage}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
        >
          ◀
        </button>
        <button
          onClick={handleNextImage}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md"
        >
          ▶
        </button>
      </div>
      <p className="text-gray-700 text-lg mb-6">{recipe?.description}</p>

      {/* Recipe Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <p className="font-bold text-secondary">Active Time:</p>
        <p>{recipe?.activeTimeInMinutes} minutes</p>
        <p className="font-bold text-secondary">Total Time:</p>
        <p>{recipe?.totalTimeInMinutes} minutes</p>
        <p className="font-bold text-secondary">Servings:</p>
        <p>{recipe?.numberOfServings}</p>
      </div>

      {/* Ingredients */}
      <ul className="list-disc list-inside mb-6">
        {recipe?.ingredients.map((ingredient, index) => (
          <li key={index} className="text-gray-700">
            {ingredient.name} : {ingredient.quantity} {ingredient.unit}
          </li>
        ))}
      </ul>

      {/* Instructions */}
      <h2 className="text-2xl font-bold text-secondary mb-4">Instructions</h2>
      <p className="text-gray-700">{recipe?.instructions}</p>
    </div>
  )
}
