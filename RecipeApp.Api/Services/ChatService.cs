using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OpenAI_API;
using RecipeApp.Api.Data;
using RecipeApp.Api.Data.Entities;
using RecipeApp.Api.DTOs;
using System.Collections.Concurrent;

namespace RecipeApp.Api.Services;

public class ChatService : IChatService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ChatService> _logger;
    private readonly OpenAIAPI _openAiApi;
    private readonly string _frontendUrl;

    // In-memory session state storage
    private static readonly ConcurrentDictionary<string, ChatState> ChatStates = new();

    public ChatService(ApplicationDbContext context, IConfiguration configuration, ILogger<ChatService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        var apiKey = configuration["OpenAI:ApiKey"] ?? throw new InvalidOperationException("OpenAI API key not configured");
        _openAiApi = new OpenAIAPI(apiKey);
        _frontendUrl = configuration["FrontendUrl"] ?? "https://chopchoprecipes.com";
    }

    public async Task<ChatMessageDto> ProcessChatAsync(string sessionId, List<ChatMessageDto> messages)
    {
        try
        {
            // Initialize or get chat state
            var state = ChatStates.GetOrAdd(sessionId, _ => new ChatState
            {
                Messages = new List<ChatMessageDto>(),
                PreviouslySuggestedRecipes = new List<int>(),
                LastSearchResults = new List<RecipeWithIngredients>(),
                LastSearchQuery = string.Empty
            });

            state.Messages = messages;

            // Get the last user message
            var lastUserMessage = messages
                .AsEnumerable()
                .Reverse()
                .FirstOrDefault(m => m.Role == "user");

            if (lastUserMessage == null || string.IsNullOrWhiteSpace(lastUserMessage.Content))
            {
                return new ChatMessageDto
                {
                    Role = "assistant",
                    Content = "I couldn't understand your message. Could you tell me what kinds of foods you enjoy?"
                };
            }

            // Check if user is asking for another recipe using OpenAI
            var requestType = await IsRequestingAnotherRecipeAsync(lastUserMessage.Content);

            if (requestType == "more" && state.LastSearchResults.Count > 0)
            {
                // Filter out previously suggested recipes
                var availableRecipes = state.LastSearchResults
                    .Where(r => !state.PreviouslySuggestedRecipes.Contains(r.Id))
                    .ToList();

                if (availableRecipes.Count > 0)
                {
                    var recipe = availableRecipes[0];
                    state.PreviouslySuggestedRecipes.Add(recipe.Id);

                    var recipeResponse = $@"Here's another recipe similar to what you're looking for:

[{recipe.Name}]({_frontendUrl}/recipes/{recipe.Id})
{recipe.Description ?? ""}

Would you like to see more recipes like this, something different, or would you like to [Explore all Recipes]({_frontendUrl}/recipes)?";

                    return new ChatMessageDto
                    {
                        Role = "assistant",
                        Content = recipeResponse
                    };
                }
                else
                {
                    return new ChatMessageDto
                    {
                        Role = "assistant",
                        Content = "I don't have any more recipes similar to your previous search. Would you like to try something different? Tell me what kind of recipe you're interested in."
                    };
                }
            }
            else if (requestType == "different")
            {
                return new ChatMessageDto
                {
                    Role = "assistant",
                    Content = "I'd be happy to help you find a different type of recipe. What kind of food are you in the mood for?"
                };
            }

            // Perform a new search
            var recipes = await FindRecipesByPreferencesAsync(lastUserMessage.Content);

            // Store the search results and query
            state.LastSearchResults = recipes;
            state.LastSearchQuery = lastUserMessage.Content;

            // Filter out previously suggested recipes
            var availableRecipesNew = recipes
                .Where(r => !state.PreviouslySuggestedRecipes.Contains(r.Id))
                .ToList();

            if (availableRecipesNew.Count > 0)
            {
                var recipe = availableRecipesNew[0];
                state.PreviouslySuggestedRecipes.Add(recipe.Id);

                var recipeResponse = $@"I found a great recipe that you might enjoy:

[{recipe.Name}]({_frontendUrl}/recipes/{recipe.Id})
{recipe.Description ?? ""}

Would you like to see more recipes like this, something different, or would you like to [Explore all Recipes]({_frontendUrl}/recipes)?";

                return new ChatMessageDto
                {
                    Role = "assistant",
                    Content = recipeResponse
                };
            }

            // If no recipes were found
            return new ChatMessageDto
            {
                Role = "assistant",
                Content = $"I couldn't find any recipes matching your preferences. Could you tell me more about what kinds of foods you enjoy?\nYou can also browse all our recipes on our [Explore Recipes]({_frontendUrl}/recipes) page."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ProcessChatAsync");
            return new ChatMessageDto
            {
                Role = "assistant",
                Content = $"I apologize, but I encountered an error while searching for recipes. You can browse all our recipes on our [Explore Recipes]({_frontendUrl}/recipes) page. Would you like to try searching with different terms?"
            };
        }
    }

    private async Task<string> IsRequestingAnotherRecipeAsync(string message)
    {
        try
        {
            var chat = _openAiApi.Chat.CreateConversation();
            chat.AppendSystemMessage(@"You are a recipe assistant. Determine if the user wants:
1. More similar recipes (""more"")
2. Different types of recipes (""different"")
3. None of the above (""no"")

IMPORTANT: Initial food preferences or requests should be ""no"", not ""different"".

Respond with ONLY ""more"", ""different"", or ""no"".

Examples:
User: ""show me another one"" -> ""more""
User: ""I want to see more recipes like this"" -> ""more""
User: ""that looks good, what else do you have?"" -> ""more""
User: ""I want something different"" -> ""different""
User: ""show me something else instead"" -> ""different""
User: ""no thanks"" -> ""no""
User: ""I don't like that recipe"" -> ""different""
User: ""I like spicy food"" -> ""no""
User: ""I want sandwiches"" -> ""no""
User: ""show me pasta recipes"" -> ""no""
User: ""I'm looking for vegetarian dishes"" -> ""no""");
            chat.AppendUserInput(message);
            chat.RequestParameters.Temperature = 0.1;
            chat.RequestParameters.MaxTokens = 10;

            var response = await chat.GetResponseFromChatbotAsync();
            var answer = response?.ToLower().Trim() ?? "no";
            return answer == "more" || answer == "different" ? answer : "no";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in IsRequestingAnotherRecipeAsync");
            // Fall back to pattern matching
            var messageLower = message.ToLower();
            if (System.Text.RegularExpressions.Regex.IsMatch(messageLower, @"\b(show|give|get|want|see|try)\b.*\b(another|more)\b.*\b(recipe|one)\b"))
                return "more";
            if (System.Text.RegularExpressions.Regex.IsMatch(messageLower, @"\b(something|anything)\b.*\b(else|different)\b"))
                return "different";
            return "no";
        }
    }

    private async Task<List<RecipeWithIngredients>> FindRecipesByPreferencesAsync(string preferences)
    {
        try
        {
            // Extract keywords using OpenAI
            var searchTerms = await ExtractKeywordsWithAIAsync(preferences);

            if (searchTerms.Count == 0)
            {
                return new List<RecipeWithIngredients>();
            }

            // Build search query
            var query = _context.Recipes
                .Include(r => r.RecipeIngredients)
                    .ThenInclude(ri => ri.Ingredient)
                .AsQueryable();

            // Apply search filters - recipes must match at least one keyword
            var filteredQuery = query.Where(r =>
                searchTerms.Any(term =>
                    r.Title.ToLower().Contains(term) ||
                    (r.Description != null && r.Description.ToLower().Contains(term)) ||
                    r.RecipeIngredients.Any(ri => ri.Ingredient.Name.ToLower().Contains(term))
                )
            );

            // Get recipes first, then rank by keyword matches in memory
            var recipesData = await filteredQuery
                .Select(r => new RecipeWithIngredients
                {
                    Id = r.Id,
                    Name = r.Title,
                    Description = r.Description,
                    Ingredients = r.RecipeIngredients
                        .Select(ri => new IngredientInfo { Name = ri.Ingredient.Name })
                        .Distinct()
                        .ToList()
                })
                .ToListAsync();

            // Rank recipes by number of matching keywords (in memory)
            var recipesWithScores = recipesData.Select(r =>
            {
                var matchCount = searchTerms.Count(term =>
                    r.Name.ToLower().Contains(term) ||
                    (r.Description != null && r.Description.ToLower().Contains(term)) ||
                    r.Ingredients.Any(ing => ing.Name.ToLower().Contains(term))
                );
                return new { Recipe = r, MatchCount = matchCount };
            })
            .OrderByDescending(x => x.MatchCount)  // Recipes matching more keywords first
            .ThenBy(x => x.Recipe.Id)  // Then by ID for consistency
            .Take(10)
            .ToList();

            var recipes = recipesWithScores.Select(x => x.Recipe).ToList();

            // Log which keywords matched for debugging
            if (recipes.Count > 0)
            {
                _logger.LogInformation("[Recipe Search] Found {RecipeCount} recipes using {KeywordCount} keywords: [{Keywords}]", 
                    recipes.Count, searchTerms.Count, string.Join(", ", searchTerms));
                var topMatches = recipesWithScores.Take(3).Select(x => 
                    $"'{x.Recipe.Name}' ({x.MatchCount} matches)");
                _logger.LogInformation("[Recipe Search] Top matches: {TopMatches}", string.Join(", ", topMatches));
            }

            return recipes;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in FindRecipesByPreferencesAsync");
            return new List<RecipeWithIngredients>();
        }
    }

    private async Task<List<string>> ExtractKeywordsWithAIAsync(string userInput)
    {
        try
        {
            // Security: Limit input length to prevent abuse
            if (string.IsNullOrWhiteSpace(userInput) || userInput.Length > 5000)
            {
                _logger.LogWarning("Invalid or too long user input for keyword extraction: {Length} characters", userInput?.Length ?? 0);
                return ExtractFoodKeywords(userInput ?? string.Empty);
            }

            var chat = _openAiApi.Chat.CreateConversation();
            chat.AppendSystemMessage(@"You are a culinary expert. Extract 5-10 food-related keywords from the user's input. 
CRITICAL: You MUST expand on the user's input - do NOT just echo back their exact words. Think of related ingredients, cuisines, dishes, cooking methods, flavors, and food categories.

Rules:
- Return AT LEAST 5 keywords, even if the user only mentions 1-2 words
- Include the user's input word(s) PLUS related culinary terms
- Focus on ingredients, cuisines, dishes, cooking methods, flavors, textures, and food categories
- Use ONLY singular forms (e.g., ""sandwich"" not ""sandwiches"")
- Return ONLY a comma-separated list of lowercase keywords, no explanations

Examples:
Input: ""pizza"" → Response: ""pizza, italian, cheese, tomato, dough, mozzarella, basil, marinara""
Input: ""chicken"" → Response: ""chicken, poultry, grilled, roasted, herbs, lemon, garlic, protein""
Input: ""spicy Asian food"" → Response: ""spicy, asian, stir-fry, noodle, curry, ginger, soy, chili, sesame""
Input: ""dessert"" → Response: ""dessert, sweet, sugar, chocolate, cake, fruit, vanilla, cream, pastry""");
            chat.AppendUserInput(userInput);
            chat.RequestParameters.Temperature = 0.5;  // Increased from 0.3 for more creativity
            chat.RequestParameters.MaxTokens = 100;  // Increased from 50 to allow more keywords

            var response = await chat.GetResponseFromChatbotAsync();
            
            // Log AI response for debugging
            _logger.LogInformation("[AI Keyword Extraction] User input: \"{UserInput}\"", userInput);
            _logger.LogInformation("[AI Keyword Extraction] AI response: \"{AiResponse}\"", response);
            
            if (!string.IsNullOrEmpty(response))
            {
                var keywords = response
                    .Split(',')
                    .Select(k => k.Trim().ToLower())
                    .Where(k => k.Length > 0)
                    .ToList();

                _logger.LogInformation("[AI Keyword Extraction] Extracted {KeywordCount} keywords: [{Keywords}]", 
                    keywords.Count, string.Join(", ", keywords));
                
                return keywords;
            }

            return ExtractFoodKeywords(userInput);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ExtractKeywordsWithAIAsync");
            return ExtractFoodKeywords(userInput);
        }
    }

    private List<string> ExtractFoodKeywords(string input)
    {
        // Basic fallback keyword extraction
        var words = input
            .ToLower()
            .Split(new[] { ' ', ',', '.' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.Trim())
            .Where(w => w.Length >= 3)
            .ToList();

        return words;
    }

    private class ChatState
    {
        public List<ChatMessageDto> Messages { get; set; } = new();
        public List<int> PreviouslySuggestedRecipes { get; set; } = new();
        public List<RecipeWithIngredients> LastSearchResults { get; set; } = new();
        public string LastSearchQuery { get; set; } = string.Empty;
    }

    private class RecipeWithIngredients
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<IngredientInfo> Ingredients { get; set; } = new();
    }

    private class IngredientInfo
    {
        public string Name { get; set; } = string.Empty;
    }
}
