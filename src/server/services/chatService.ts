import dotenv from "dotenv"
import { db } from "../../db/index.js"
import {
  recipesTable,
  recipeIngredientsTable,
  ingredientsTable,
} from "../../db/schema.js"
import { eq } from "drizzle-orm"
import { sql } from "drizzle-orm"
import OpenAI from "openai"

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

// Map common food terms to related ingredients and cuisines
const foodRelations = new Map<string, string[]>([
  [
    "pizza",
    [
      "italian",
      "tomato",
      "cheese",
      "basil",
      "dough",
      "pepperoni",
      "mozzarella",
    ],
  ],
  ["pasta", ["italian", "tomato", "garlic", "parmesan", "basil", "olive oil"]],
  ["burger", ["beef", "bun", "cheese", "lettuce", "tomato", "onion"]],
  [
    "salad",
    ["lettuce", "tomato", "cucumber", "olive oil", "vinegar", "healthy"],
  ],
  ["steak", ["beef", "garlic", "butter", "rosemary", "thyme"]],
  ["chicken", ["poultry", "garlic", "herbs", "lemon", "olive oil"]],
  ["fish", ["seafood", "lemon", "butter", "herbs", "garlic"]],
  ["soup", ["broth", "vegetables", "herbs", "warm", "comfort"]],
  ["stir fry", ["asian", "soy sauce", "vegetables", "ginger", "garlic"]],
  ["curry", ["indian", "spices", "coconut", "rice", "ginger", "garlic"]],
  ["tacos", ["mexican", "tortilla", "salsa", "cilantro", "lime"]],
  ["sushi", ["japanese", "rice", "seafood", "nori", "wasabi"]],
])

// List of cuisine types to help identify food preferences
const cuisineTypes = new Set([
  "italian",
  "mexican",
  "chinese",
  "japanese",
  "indian",
  "thai",
  "mediterranean",
  "french",
  "american",
  "korean",
  "vietnamese",
  "greek",
  "spanish",
  "middle eastern",
])

async function extractKeywordsWithAI(userInput: string): Promise<string[]> {
  try {
    console.log("Extracting keywords from user input with OpenAI:", userInput)

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a culinary expert. Extract up to 10 food-related keywords from the user's input. 
          Focus on ingredients, cuisines, dishes, and cooking methods. 
          Respond ONLY with a comma-separated list of lowercase keywords, no explanations.
          Example input: "I love spicy Asian food and seafood"
          Example response: "spicy, asian, seafood, stir-fry, noodles, curry"`,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    })

    const keywords =
      response.choices[0]?.message?.content
        ?.split(",")
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 0) || []

    console.log("OpenAI extracted keywords:", keywords)
    return keywords
  } catch (error) {
    console.error("Error extracting keywords with OpenAI:", error)
    // Fall back to basic keyword extraction if OpenAI fails
    return extractFoodKeywords(userInput)
  }
}

function extractFoodKeywords(input: string): string[] {
  const words = input
    .toLowerCase()
    .split(/[,.]?\s+/)
    .map((word) => word.trim())
  const keywords = new Set<string>()

  // First pass: look for direct matches in our food relations and cuisine types
  for (const word of words) {
    if (foodRelations.has(word)) {
      keywords.add(word)
      // Add related terms
      foodRelations.get(word)?.forEach((term) => keywords.add(term))
    }
    if (cuisineTypes.has(word)) {
      keywords.add(word)
    }
  }

  // Second pass: look for compound terms (e.g., "stir fry")
  for (let i = 0; i < words.length - 1; i++) {
    const compound = words[i] + " " + words[i + 1]
    if (foodRelations.has(compound)) {
      keywords.add(compound)
      // Add related terms
      foodRelations.get(compound)?.forEach((term) => keywords.add(term))
    }
  }

  // If no keywords found, include original words that might be food-related
  if (keywords.size === 0) {
    words.forEach((word) => {
      // Add words that are likely food-related (not too short, not common words)
      if (word.length >= 3 && !isCommonWord(word)) {
        keywords.add(word)
      }
    })
  }

  return Array.from(keywords)
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    "the",
    "be",
    "to",
    "of",
    "and",
    "a",
    "in",
    "that",
    "have",
    "i",
    "it",
    "for",
    "not",
    "on",
    "with",
    "he",
    "as",
    "you",
    "do",
    "at",
    "this",
    "but",
    "his",
    "by",
    "from",
    "they",
    "we",
    "say",
    "her",
    "she",
    "or",
    "an",
    "will",
    "my",
    "one",
    "all",
    "would",
    "there",
    "their",
    "what",
    "so",
    "up",
    "out",
    "if",
    "about",
    "who",
    "get",
    "which",
    "go",
    "me",
    "when",
    "make",
    "can",
    "like",
    "time",
    "no",
    "just",
    "him",
    "know",
    "take",
    "people",
    "into",
    "year",
    "your",
    "good",
    "some",
    "could",
    "them",
    "see",
    "other",
    "than",
    "then",
    "now",
    "look",
    "only",
    "come",
    "its",
    "over",
    "think",
    "also",
    "back",
    "after",
    "use",
    "two",
    "how",
    "our",
    "work",
    "first",
    "well",
    "way",
    "even",
    "new",
    "want",
    "because",
    "any",
    "these",
    "give",
    "day",
    "most",
    "us",
    "need",
    "trying",
    "looking",
    "please",
    "help",
    "try",
    "much",
    "many",
    "lot",
    "very",
    "really",
    "something",
    "anything",
    "everything",
    "nothing",
    "find",
    "found",
    "want",
    "needs",
    "needed",
    "today",
    "tonight",
    "tomorrow",
    "yesterday",
    "week",
    "month",
    "year",
  ])
  return commonWords.has(word)
}

async function findRecipesByPreferences(
  preferences: string
): Promise<RecipeWithIngredients[]> {
  try {
    console.log("Starting recipe search with preferences:", preferences)

    // Extract keywords using OpenAI
    const searchTerms = await extractKeywordsWithAI(preferences)
    console.log("AI-extracted food keywords:", searchTerms)

    if (searchTerms.length === 0) {
      console.log("No valid search terms found")
      return []
    }

    // Build search conditions for each term
    const searchConditions = searchTerms.map((term) => {
      return sql`(
        LOWER(${recipesTable.title}) LIKE ${"%" + term + "%"} OR 
        LOWER(${recipesTable.description}) LIKE ${"%" + term + "%"} OR 
        LOWER(${ingredientsTable.name}) LIKE ${"%" + term + "%"}
      )`
    })

    // Combine conditions with OR
    const whereClause = sql.join(searchConditions, sql` OR `)

    // Search for recipes with ranking
    const recipes = await db
      .select({
        id: recipesTable.id,
        name: recipesTable.title,
        description: recipesTable.description,
        ingredients: sql<Array<{ name: string }>>`
          array_agg(DISTINCT jsonb_build_object('name', ${ingredientsTable.name}))
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
      .orderBy(
        sql`
        CASE 
          WHEN LOWER(${recipesTable.title}) LIKE ${searchTerms[0] + "%"} THEN 3
          WHEN LOWER(${recipesTable.title}) LIKE ${
          "%" + searchTerms[0] + "%"
        } THEN 2
          WHEN LOWER(${recipesTable.description}) LIKE ${
          "%" + searchTerms[0] + "%"
        } THEN 1
          ELSE 0
        END DESC
      `
      )
      .limit(10)

    console.log("Search results:", {
      termCount: searchTerms.length,
      searchTerms,
      recipeCount: recipes.length,
      topResults: recipes.map((r) => ({
        id: r.id,
        name: r.name,
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

    // Get the last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user")
    console.log("Last user message:", lastUserMessage?.content)

    if (lastUserMessage?.content) {
      console.log("Searching database for recipes...")
      const recipes = await findRecipesByPreferences(lastUserMessage.content)
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

        // Format the recipe suggestion with a link
        const recipeResponse = `Based on your interest in ${
          lastUserMessage.content
        }, I found a great recipe that you might enjoy:

[${recipe.name}](https://chopchoprecipes.com/recipes/${recipe.id})
${recipe.description || ""}

Would you like to see more recipes like this, or would you prefer something different?`

        return {
          role: "assistant",
          content: recipeResponse,
        }
      }
    }

    // If no recipes were found, suggest browsing the Explore page
    return {
      role: "assistant",
      content: `I couldn't find any recipes matching your preferences in our database. You can browse all our recipes on our [Explore Recipes](https://chopchoprecipes.com/recipes) page. Could you tell me more about what kinds of foods you enjoy?`,
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
        "I apologize, but I encountered an error while searching for recipes. You can browse all our recipes on our [Explore Recipes](https://chopchoprecipes.com/recipes) page. Would you like to try searching with different terms?",
    }
  }
}
