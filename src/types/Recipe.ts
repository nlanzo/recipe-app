export interface Recipe {
  id: number
  userId: number
  title: string
  description: string
  instructions: string
  activeTimeInMinutes: number
  totalTimeInMinutes: number
  numberOfServings: number
  createdAt: string
  updatedAt: string
  author?: {
    username: string
    id: number
  }
  categories: string[]
  ingredients: {
    name: string
    quantity: string
    unit: string
  }[]
  images: {
    imageUrl: string
    altText: string | null
    isPrimary: boolean
  }[]
}

// For list views that need less information
export interface RecipeListItem {
  id: number
  title: string
  imageUrl: string | null
  totalTimeInMinutes: number
  numberOfServings: number
}

// For admin table view
export interface AdminRecipeItem {
  id: number
  name: string
  username: string
  createdAt: string
  totalTimeInMinutes: number
  numberOfServings: number
}
