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
    console.log("Starting recipe search with preferences:", preferences)

    // Extract key food terms using a more focused approach
    const searchTerms = preferences
      .toLowerCase()
      .split(/[,.]?\s+/)
      .map((term) => term.trim())
      // Filter out common words and keep only relevant food terms
      .filter((term) => {
        const commonWords = new Set([
          "a",
          "an",
          "the",
          "and",
          "or",
          "but",
          "in",
          "on",
          "at",
          "to",
          "for",
          "with",
          "without",
          "is",
          "are",
          "was",
          "were",
          "be",
          "been",
          "being",
          "have",
          "has",
          "had",
          "do",
          "does",
          "did",
          "will",
          "would",
          "should",
          "could",
          "can",
          "may",
          "might",
          "must",
          "shall",
          "this",
          "that",
          "these",
          "those",
          "i",
          "you",
          "he",
          "she",
          "it",
          "we",
          "they",
          "good",
          "like",
          "want",
          "try",
          "make",
          "need",
          "looking",
        ])

        // Keep terms that are either:
        // 1. Important short food terms
        const importantTerms = new Set([
          "pie",
          "dip",
          "raw",
          "bbq",
          "wok",
          "stir",
        ])
        // 2. Not in common words list and at least 3 characters
        return (
          importantTerms.has(term) ||
          (!commonWords.has(term) && term.length >= 3)
        )
      })
      .slice(0, 3) // Only use the first 3 relevant terms to keep search focused

    console.log("Processed search terms:", searchTerms)

    if (searchTerms.length === 0) {
      console.log("No valid search terms found")
      return []
    }

    // Build simpler, more focused search conditions
    const searchConditions = searchTerms.map((term) => {
      console.log("Building search condition for term:", term)
      return sql`(
        LOWER(${recipesTable.title}) LIKE ${"%" + term + "%"} OR 
        LOWER(${recipesTable.description}) LIKE ${"%" + term + "%"} OR 
        LOWER(${ingredientsTable.name}) LIKE ${"%" + term + "%"}
      )`
    })

    // Combine conditions - require at least one match
    const whereClause = sql.join(searchConditions, sql` OR `)
    console.log("Search terms count:", searchTerms.length)

    // Build the search query with ranking
    const recipes = await db
      .select({
        id: recipesTable.id,
        name: recipesTable.title,
        description: recipesTable.description,
        ingredients: sql<Array<{ name: string }>>`
          array_agg(DISTINCT jsonb_build_object('name', ${ingredientsTable.name}))
        `,
        rank: sql`
          (CASE 
            WHEN LOWER(${recipesTable.title}) LIKE ${
          searchTerms[0] + "%"
        } THEN 3
            WHEN LOWER(${recipesTable.title}) LIKE ${
          "%" + searchTerms[0] + "%"
        } THEN 2
            WHEN LOWER(${recipesTable.description}) LIKE ${
          "%" + searchTerms[0] + "%"
        } THEN 1
            ELSE 0
          END)
        `,
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
      .where(whereClause)
      .groupBy(recipesTable.id, recipesTable.title, recipesTable.description)
      .orderBy(sql`rank DESC`)
      .limit(10)

    console.log("Search results:", {
      termCount: searchTerms.length,
      searchTerms,
      recipeCount: recipes.length,
      topResults: recipes.map((r) => ({
        id: r.id,
        name: r.name,
        rank: r.rank,
      })),
    })

    return recipes
  } catch (error) {
    console.error("Error in findRecipesByPreferences:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      preferences,
    })
    throw error
  }
}

export async function processChat(
  sessionId: string,
  messages: Message[]
): Promise<Message> {
  try {
    console.log("Starting processChat with sessionId:", sessionId)

    // Initialize or get chat state
    if (!chatStates.has(sessionId)) {
      console.log("Initializing new chat state for session:", sessionId)
      chatStates.set(sessionId, {
        messages: [],
        previouslySuggestedRecipes: [],
      })
    }

    const state = chatStates.get(sessionId)!
    state.messages = messages

    // Extract the last user message for context
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user")
    console.log("Last user message:", lastUserMessage?.content)

    // Prepare conversation for OpenAI
    console.log("Preparing OpenAI conversation...")
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

Remember: Suggest only ONE recipe at a time and keep track of which recipes have been suggested.

When suggesting a recipe, format your response to clearly indicate the recipe suggestion by starting with "RECIPE_SUGGESTION:" followed by your description.`,
      },
      ...state.messages,
    ]

    console.log("Calling OpenAI API...")
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: conversation,
      temperature: 0.7,
      max_tokens: 500,
    })

    console.log("OpenAI API response received")
    const response = completion.choices[0].message.content

    // Check for recipe suggestion with improved detection
    if (response?.includes("RECIPE_SUGGESTION:")) {
      console.log("OpenAI suggested a recipe, searching database...")

      // Extract the suggestion part
      const suggestion = response.split("RECIPE_SUGGESTION:")[1].trim()
      console.log("Extracted suggestion:", suggestion)

      // Combine with the last user message for better context
      const searchQuery = `${lastUserMessage?.content || ""} ${suggestion}`
      console.log("Combined search query:", searchQuery)

      const recipes = await findRecipesByPreferences(searchQuery)
      console.log(`Found ${recipes.length} total recipes`)

      // Filter out previously suggested recipes
      const availableRecipes = recipes.filter(
        (recipe) => !state.previouslySuggestedRecipes.includes(recipe.id)
      )
      console.log(
        `${availableRecipes.length} recipes available after filtering previously suggested`
      )

      if (availableRecipes.length > 0) {
        // Take the first available recipe
        const recipe = availableRecipes[0]
        state.previouslySuggestedRecipes.push(recipe.id)
        console.log("Selected recipe:", {
          id: recipe.id,
          name: recipe.name,
          ingredientCount: recipe.ingredients.length,
        })

        // Format the recipe suggestion
        const recipeResponse = `I found a great recipe that matches your preferences:

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
        console.log("No available recipes found")
        return {
          role: "assistant",
          content:
            "I've looked through our recipes, but I can't find any additional ones that match your preferences. Would you like to try with different criteria? For example, you could specify a different main ingredient or cooking style.",
        }
      }
    }

    // If no recipe suggestion, return the original response
    console.log("No recipe suggestion in OpenAI response")
    return {
      role: "assistant",
      content:
        response ||
        "I apologize, but I couldn't process your request. Could you please try rephrasing it?",
    }
  } catch (error) {
    console.error("Error in processChat:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      sessionId,
      lastMessage: messages[messages.length - 1]?.content,
    })
    return {
      role: "assistant",
      content:
        "I apologize, but I encountered an error while searching for recipes. Please try describing what you're looking for in a different way.",
    }
  }
}
