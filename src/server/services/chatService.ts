import { ChatCompletionMessageParam } from "openai/resources/chat"
import dotenv from "dotenv"
import OpenAI from "openai"
import { db } from "../../db/index.js"
import {
  recipesTable,
  recipeIngredientsTable,
  ingredientsTable,
} from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"

dotenv.config()

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

interface RecipeWithIngredients {
  id: number
  name: string
  description: string | null
  ingredients: Array<{ name: string }>
}

interface ChatState {
  messages: Message[]
  previouslySuggestedRecipes: number[] // Track recipe IDs that were already suggested
}

const chatStates = new Map<string, ChatState>()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function findRecipesByPreferences(
  preferences: string
): Promise<RecipeWithIngredients[]> {
  try {
    // Convert preferences to search terms
    const searchTerms = preferences.toLowerCase().split(/\s+/)

    // Build the search query
    const recipes = await db
      .select({
        id: recipesTable.id,
        name: recipesTable.title,
        description: recipesTable.description,
        ingredients: sql<
          Array<{ name: string }>
        >`array_agg(json_build_object('name', ${ingredientsTable.name}))`,
      })
      .from(recipesTable)
      .leftJoin(
        recipeIngredientsTable,
        eq(recipeIngredientsTable.recipeId, recipesTable.id)
      )
      .leftJoin(
        ingredientsTable,
        eq(ingredientsTable.id, recipeIngredientsTable.ingredientId)
      )
      .where(
        sql`LOWER(${recipesTable.title}) LIKE ANY(${searchTerms.map(
          (term) => `%${term}%`
        )}) OR
            LOWER(${recipesTable.description}) LIKE ANY(${searchTerms.map(
          (term) => `%${term}%`
        )}) OR
            LOWER(${ingredientsTable.name}) LIKE ANY(${searchTerms.map(
          (term) => `%${term}%`
        )})`
      )
      .groupBy(recipesTable.id, recipesTable.title, recipesTable.description)

    return recipes
  } catch (error) {
    console.error("Error finding recipes:", error)
    return []
  }
}

export async function processChat(
  sessionId: string,
  messages: Message[]
): Promise<Message> {
  // Initialize or get chat state
  if (!chatStates.has(sessionId)) {
    chatStates.set(sessionId, {
      messages: [],
      previouslySuggestedRecipes: [],
    })
  }

  const state = chatStates.get(sessionId)!
  state.messages = messages

  // Prepare conversation for OpenAI
  const conversation: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a helpful recipe assistant. Your role is to:
1. Understand user preferences and dietary restrictions
2. Suggest ONE recipe at a time from our database that best matches their needs
3. If they ask for another recipe, suggest a different one that hasn't been suggested before
4. If no more matching recipes are available, politely explain that and ask if they'd like to try something else
5. Keep responses concise and focused on the current recipe
6. Always include the recipe name and a brief description
7. Never combine or merge recipes
8. Only suggest recipes that exist in our database

Key aspects to focus on:
- Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
- Flavor preferences (spicy, mild, sweet, savory)
- Meal types (breakfast, lunch, dinner, snack)
- Time constraints
- Ingredient preferences or restrictions

Remember: Suggest only ONE recipe at a time and keep track of which recipes have been suggested.`,
    },
    ...state.messages,
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: conversation,
      temperature: 0.7,
      max_tokens: 500,
    })

    const response = completion.choices[0].message.content

    // If the response contains a recipe suggestion, find matching recipes
    if (response?.toLowerCase().includes("recipe")) {
      const recipes = await findRecipesByPreferences(response)

      // Filter out previously suggested recipes
      const availableRecipes = recipes.filter(
        (recipe) => !state.previouslySuggestedRecipes.includes(recipe.id)
      )

      if (availableRecipes.length > 0) {
        // Take the first available recipe
        const recipe = availableRecipes[0]
        state.previouslySuggestedRecipes.push(recipe.id)

        // Format the recipe suggestion
        const recipeResponse = `Here's a recipe that matches your preferences:

${recipe.name}
${recipe.description || ""}

Ingredients:
${recipe.ingredients.map((i) => `- ${i.name}`).join("\n")}

Would you like to see the full recipe details or would you prefer a different suggestion?`

        return {
          role: "assistant",
          content: recipeResponse,
        }
      } else {
        // No more matching recipes available
        return {
          role: "assistant",
          content:
            "I'm sorry, I can't find any additional recipes that match your preferences. Would you like to try something else?",
        }
      }
    }

    // If no recipe suggestion, return the original response
    return {
      role: "assistant",
      content:
        response ||
        "I apologize, but I couldn't process your request. Could you please try rephrasing it?",
    }
  } catch (error) {
    console.error("Error processing chat:", error)
    return {
      role: "assistant",
      content:
        "I apologize, but I encountered an error processing your request. Please try again.",
    }
  }
}
