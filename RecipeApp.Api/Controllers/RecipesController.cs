using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeApp.Api.DTOs;
using RecipeApp.Api.Services;
using System.Security.Claims;

namespace RecipeApp.Api.Controllers;

/// <summary>
/// Controller for managing recipes
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class RecipesController : ControllerBase
{
    private readonly IRecipeService _recipeService;

    public RecipesController(IRecipeService recipeService)
    {
        _recipeService = recipeService;
    }

    /// <summary>
    /// Gets a paginated list of recipes
    /// </summary>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="search">Optional search term to filter recipes</param>
    /// <param name="sort">Optional sort parameter (e.g., "name", "createdDate")</param>
    /// <returns>A paginated result containing recipes</returns>
    /// <response code="200">Returns the list of recipes</response>
    /// <response code="500">If there was an error fetching recipes</response>
    [HttpGet]
    public async Task<ActionResult<PaginatedResult<RecipeResponseDto>>> GetRecipes(
        [FromQuery] int page = 1,
        [FromQuery] string? search = null,
        [FromQuery] string? sort = null)
    {
        try
        {
            var result = await _recipeService.GetRecipesAsync(page, search, sort);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch recipes", message = ex.Message });
        }
    }

    /// <summary>
    /// Searches recipes by query string
    /// </summary>
    /// <param name="query">Search query string (required)</param>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="sort">Optional sort parameter</param>
    /// <returns>A paginated result containing matching recipes</returns>
    /// <response code="200">Returns the search results</response>
    /// <response code="400">If the query parameter is missing or empty</response>
    /// <response code="500">If there was an error searching recipes</response>
    [HttpGet("search")]
    public async Task<ActionResult<PaginatedResult<RecipeResponseDto>>> SearchRecipes(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] string? sort = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(new { error = "Query parameter is required" });
            }

            var result = await _recipeService.SearchRecipesAsync(query, page, sort);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to search recipes", message = ex.Message });
        }
    }

    /// <summary>
    /// Gets a recipe by ID
    /// </summary>
    /// <param name="id">The recipe ID</param>
    /// <returns>The recipe details</returns>
    /// <response code="200">Returns the recipe</response>
    /// <response code="404">If the recipe is not found</response>
    /// <response code="500">If there was an error fetching the recipe</response>
    [HttpGet("{id}")]
    public async Task<ActionResult<RecipeDetailDto>> GetRecipe(int id)
    {
        try
        {
            var recipe = await _recipeService.GetRecipeByIdAsync(id);
            if (recipe == null)
                return NotFound(new { error = "Recipe not found" });

            return Ok(recipe);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch recipe", message = ex.Message });
        }
    }

    /// <summary>
    /// Creates a new recipe
    /// </summary>
    /// <param name="dto">The recipe data</param>
    /// <returns>The created recipe ID</returns>
    /// <response code="201">Returns the created recipe ID</response>
    /// <response code="400">If the recipe data is invalid</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="500">If there was an error creating the recipe</response>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult> CreateRecipe([FromForm] CreateRecipeDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "User ID is required" });
            }

            var images = Request.Form.Files.Where(f => f.Name == "images" || string.IsNullOrEmpty(f.Name)).ToList();

            // If no files found with "images" name, get all files (fallback)
            if (images.Count == 0)
            {
                images = Request.Form.Files.ToList();
            }

            // Parse JSON strings from form data BEFORE validation
            // This is needed because form-data sends arrays as JSON strings
            if (Request.Form.ContainsKey("categories"))
            {
                var categoriesJson = Request.Form["categories"].ToString();
                if (!string.IsNullOrEmpty(categoriesJson))
                {
                    try
                    {
                        var jsonOptions = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };
                        dto.Categories = System.Text.Json.JsonSerializer.Deserialize<List<string>>(categoriesJson, jsonOptions) ?? new List<string>();
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        return BadRequest(new { error = "Invalid categories JSON format", details = ex.Message });
                    }
                }
            }

            if (Request.Form.ContainsKey("ingredients"))
            {
                var ingredientsJson = Request.Form["ingredients"].ToString();
                if (!string.IsNullOrEmpty(ingredientsJson))
                {
                    try
                    {
                        // Configure JSON options to be case-insensitive to match lowercase JSON from frontend
                        var jsonOptions = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };
                        dto.Ingredients = System.Text.Json.JsonSerializer.Deserialize<List<CreateIngredientDto>>(ingredientsJson, jsonOptions) ?? new List<CreateIngredientDto>();
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        return BadRequest(new { error = "Invalid ingredients JSON format", details = ex.Message });
                    }
                }
            }

            // Manual validation for parsed fields
            if (dto.Categories == null || dto.Categories.Count == 0)
            {
                return BadRequest(new { error = "Validation failed", errors = new[] { new { Field = "Categories", Error = "At least one category is required" } } });
            }

            if (dto.Ingredients == null || dto.Ingredients.Count == 0)
            {
                return BadRequest(new { error = "Validation failed", errors = new[] { new { Field = "Ingredients", Error = "At least one ingredient is required" } } });
            }

            // Validate the rest of the DTO
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .SelectMany(x => x.Value!.Errors.Select(e => new { Field = x.Key, Error = e.ErrorMessage }))
                    .ToList();
                return BadRequest(new { error = "Validation failed", errors });
            }

            var recipeId = await _recipeService.CreateRecipeAsync(dto, userId, images);
            return CreatedAtAction(nameof(GetRecipe), new { id = recipeId }, new { message = "Recipe added successfully!", id = recipeId });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to add recipe", message = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing recipe
    /// </summary>
    /// <param name="id">The recipe ID</param>
    /// <param name="dto">The updated recipe data</param>
    /// <param name="removedImages">Optional JSON array of image URLs to remove</param>
    /// <returns>Success message</returns>
    /// <response code="200">Returns success message</response>
    /// <response code="400">If the recipe data is invalid</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not authorized to update this recipe</response>
    /// <response code="404">If the recipe is not found</response>
    /// <response code="500">If there was an error updating the recipe</response>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult> UpdateRecipe(
        int id,
        [FromForm] UpdateRecipeDto dto,
        [FromForm] string? removedImages = null)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            // Parse JSON strings from form data BEFORE validation
            if (Request.Form.ContainsKey("categories"))
            {
                var categoriesJson = Request.Form["categories"].ToString();
                if (!string.IsNullOrEmpty(categoriesJson))
                {
                    try
                    {
                        var jsonOptions = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        dto.Categories = System.Text.Json.JsonSerializer.Deserialize<List<string>>(categoriesJson, jsonOptions) ?? new List<string>();
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        return BadRequest(new { error = "Invalid categories JSON format", details = ex.Message });
                    }
                }
            }

            if (Request.Form.ContainsKey("ingredients"))
            {
                var ingredientsJson = Request.Form["ingredients"].ToString();
                if (!string.IsNullOrEmpty(ingredientsJson))
                {
                    try
                    {
                        var jsonOptions = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        dto.Ingredients = System.Text.Json.JsonSerializer.Deserialize<List<CreateIngredientDto>>(ingredientsJson, jsonOptions) ?? new List<CreateIngredientDto>();
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        return BadRequest(new { error = "Invalid ingredients JSON format", details = ex.Message });
                    }
                }
            }

            // Parse numeric fields that might come as strings in form-data
            if (Request.Form.ContainsKey("totalTimeInMinutes") && int.TryParse(Request.Form["totalTimeInMinutes"].ToString(), out var totalTime))
            {
                dto.TotalTimeInMinutes = totalTime;
            }
            if (Request.Form.ContainsKey("numberOfServings") && int.TryParse(Request.Form["numberOfServings"].ToString(), out var servings))
            {
                dto.NumberOfServings = servings;
            }
            if (Request.Form.ContainsKey("activeTimeInMinutes") && int.TryParse(Request.Form["activeTimeInMinutes"].ToString(), out var activeTime))
            {
                dto.ActiveTimeInMinutes = activeTime;
            }

            // Manual validation for parsed fields
            if (dto.Categories == null || dto.Categories.Count == 0)
            {
                return BadRequest(new { error = "Validation failed", errors = new[] { new { Field = "Categories", Error = "At least one category is required" } } });
            }
            if (dto.Ingredients == null || dto.Ingredients.Count == 0)
            {
                return BadRequest(new { error = "Validation failed", errors = new[] { new { Field = "Ingredients", Error = "At least one ingredient is required" } } });
            }

            // Validate the rest of the DTO
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Where(x => x.Value?.Errors.Count > 0).SelectMany(x => x.Value!.Errors.Select(e => new { Field = x.Key, Error = e.ErrorMessage })).ToList();
                return BadRequest(new { error = "Validation failed", errors });
            }

            // Get new images from form files (similar to CreateRecipe)
            var newImages = Request.Form.Files.Where(f => f.Name == "newImages" || f.Name == "images").ToList();
            if (newImages.Count == 0)
            {
                // Fallback: get all files if no specific name matches
                newImages = Request.Form.Files.ToList();
            }

            List<string>? removedImagesList = null;
            if (!string.IsNullOrEmpty(removedImages))
            {
                removedImagesList = System.Text.Json.JsonSerializer.Deserialize<List<string>>(removedImages);
            }

            await _recipeService.UpdateRecipeAsync(id, dto, userId, newImages, removedImagesList);
            return Ok(new { message = "Recipe updated successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to update recipe", message = ex.Message });
        }
    }

    /// <summary>
    /// Deletes a recipe
    /// </summary>
    /// <param name="id">The recipe ID</param>
    /// <returns>Success message</returns>
    /// <response code="200">Returns success message</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not authorized to delete this recipe</response>
    /// <response code="404">If the recipe is not found</response>
    /// <response code="500">If there was an error deleting the recipe</response>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<ActionResult> DeleteRecipe(int id)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            await _recipeService.DeleteRecipeAsync(id, userId);
            return Ok(new { message = "Recipe and associated data deleted successfully." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to delete recipe", message = ex.Message });
        }
    }
}
