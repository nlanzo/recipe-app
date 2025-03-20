import OpenAI from "openai"
import { db } from "../../db/index.js"
import {
  recipesTable,
  recipeIngredientsTable,
  ingredientsTable,
} from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { ChatCompletionMessageParam } from "openai/resources/chat"
import dotenv from "dotenv"

dotenv.config()
const DOMAIN_NAME = process.env.DOMAIN_NAME

// Validate OpenAI API key at startup
const validateOpenAIKey = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables")
  }
  if (!apiKey.startsWith("sk-")) {
    throw new Error(
      "OPENAI_API_KEY appears to be invalid - should start with 'sk-'"
    )
  }
  return apiKey
}

const openai = new OpenAI({
  apiKey: validateOpenAIKey(),
})

// Test the OpenAI connection
const testOpenAIConnection = async () => {
  try {
    console.log("Testing OpenAI connection...")
    const test = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 5,
    })
    console.log("Test response:", test)
    console.log("OpenAI connection test successful")
    return true
  } catch (error) {
    console.error("OpenAI connection test failed:", error)
    if (error instanceof Error) {
      console.error("Error details:", error.message)
      if (error.message.includes("auth")) {
        throw new Error(
          "OpenAI authentication failed - please check your API key"
        )
      }
      if (error.message.includes("connect")) {
        throw new Error(
          "Could not connect to OpenAI - please check your network connection"
        )
      }
    }
    throw error
  }
}

// Test connection at startup
testOpenAIConnection().catch(console.error)

interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatResponse {
  message: string
  recipeIds?: number[]
}

interface RecipeWithIngredients {
  id: number
  title: string
  description: string | null
  ingredients: Array<{ name: string }>
}

export class ChatService {
  private static async getRecipes(): Promise<RecipeWithIngredients[]> {
    try {
      return await db
        .select({
          id: recipesTable.id,
          title: recipesTable.title,
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
        .groupBy(recipesTable.id, recipesTable.title, recipesTable.description)
    } catch (error) {
      console.error("Error fetching recipes:", error)
      throw error
    }
  }

  private static async findRecipesByPreferences(preferences: string[]) {
    try {
      const allRecipes = await ChatService.getRecipes()
      return allRecipes.filter((recipe) => {
        const searchText = `${recipe.title} ${
          recipe.description || ""
        } ${recipe.ingredients.map((i) => i.name).join(" ")}`.toLowerCase()
        return preferences.some((pref) =>
          searchText.includes(pref.toLowerCase())
        )
      })
    } catch (error) {
      console.error("Error finding recipes by preferences:", error)
      throw error
    }
  }

  private static extractPreferences(content: string): string[] {
    try {
      const preferences = content
        .toLowerCase()
        .match(
          /\b(spicy|sweet|savory|vegetarian|vegan|meat|fish|chicken|pasta|rice|quick|healthy|dessert|breakfast|lunch|dinner)\b/g
        )
      return preferences || []
    } catch (error) {
      console.error("Error extracting preferences:", error)
      return []
    }
  }

  public static async processChat(messages: Message[]): Promise<ChatResponse> {
    try {
      console.log("Starting chat processing with messages:", messages)

      // Prepare the conversation for OpenAI
      const conversation: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are a recipe assistant for ${DOMAIN_NAME}. Your role is to help users find recipes from our existing database only.
          
          IMPORTANT RULES:
          - NEVER suggest or discuss recipes that aren't in our database
          - NEVER combine or create new recipe variations
          - ONLY recommend recipes that are returned from our database search
          - If no matching recipes are found, ask for different preferences or dietary requirements
          
          Follow this conversation flow:
          1. First message: Ask about dietary restrictions (vegetarian, vegan, gluten-free, etc.)
          2. After learning restrictions: Ask about preferences (meal type, flavors, etc.)
          3. Once you have enough information: Wait for our database to find matching recipes
          4. ONLY suggest the specific recipes provided by our database search
          
          Keep responses friendly and concise. Focus on understanding:
          - Dietary restrictions
          - Flavor preferences
          - Meal type preferences
          - Time constraints
          
          Remember: You can ONLY suggest recipes that our database returns. Never make up or combine recipes.`,
        },
        ...(messages as ChatCompletionMessageParam[]),
      ]

      console.log("Sending request to OpenAI with conversation:", conversation)

      // Get AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversation,
        temperature: 0.7,
        max_tokens: 200,
      })

      console.log("Received response from OpenAI:", completion)

      const aiMessage = completion.choices[0].message.content || ""

      // Extract preferences from the entire conversation
      const preferences = messages.flatMap((msg) =>
        ChatService.extractPreferences(msg.content)
      )

      console.log("Extracted preferences:", preferences)

      // Only include recipe suggestions if we have more than one message exchange
      if (preferences.length > 0 && messages.length >= 3) {
        // Find matching recipes
        const matchingRecipes = await ChatService.findRecipesByPreferences(
          preferences
        )

        console.log("Found matching recipes:", matchingRecipes)

        if (matchingRecipes.length > 0) {
          const recipeList = matchingRecipes
            .slice(0, 3)
            .map(
              (recipe) =>
                `\n• ${recipe.title}: (https://${DOMAIN_NAME}/recipes/${recipe.id})`
            )
            .join("")

          return {
            message: `Based on your preferences, I found these recipes in our database that you might enjoy:${recipeList}\n\nWould you like me to find more recipes or would you like to refine your preferences?`,
            recipeIds: matchingRecipes.slice(0, 3).map((recipe) => recipe.id),
          }
        } else {
          return {
            message:
              "I couldn't find any recipes in our database matching your preferences. Would you like to try different preferences or dietary requirements? For example, you could specify a different meal type or flavor preference.",
          }
        }
      }

      return { message: aiMessage }
    } catch (error) {
      console.error("Chat processing error:", error)
      if (error instanceof Error) {
        console.error("Error details:", error.message)
        console.error("Error stack:", error.stack)
      }
      throw error
    }
  }
}
