using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeApp.Api.Services;

namespace RecipeApp.Api.Controllers;

/// <summary>
/// Controller for managing saved recipes
/// </summary>
[ApiController]
[Route("api")]
public class SavedRecipesController : ControllerBase
{
    private readonly IRecipeService _recipeService;

    public SavedRecipesController(IRecipeService recipeService)
    {
        _recipeService = recipeService;
    }

    /// <summary>
    /// Save a recipe to the user's saved recipes
    /// </summary>
    /// <param name="id">The recipe ID to save</param>
    /// <returns>Success message</returns>
    /// <response code="200">Recipe saved successfully</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="404">If the recipe is not found</response>
    /// <response code="409">If the recipe is already saved</response>
    /// <response code="500">If there was an error saving the recipe</response>
    [HttpPost("recipes/{id}/save")]
    [Authorize]
    public async Task<ActionResult> SaveRecipe(int id)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            await _recipeService.SaveRecipeAsync(id, userId);
            return Ok(new { message = "Recipe saved successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message, message = "This recipe is already in your saved recipes" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to save recipe", message = ex.Message });
        }
    }

    /// <summary>
    /// Unsave a recipe from the user's saved recipes
    /// </summary>
    /// <param name="id">The recipe ID to unsave</param>
    /// <returns>Success message</returns>
    /// <response code="200">Recipe unsaved successfully</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="404">If the saved recipe is not found</response>
    /// <response code="500">If there was an error unsaving the recipe</response>
    [HttpDelete("recipes/{id}/save")]
    [Authorize]
    public async Task<ActionResult> UnsaveRecipe(int id)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            await _recipeService.UnsaveRecipeAsync(id, userId);
            return Ok(new { message = "Recipe unsaved successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to unsave recipe", message = ex.Message });
        }
    }

    /// <summary>
    /// Get all recipes saved by the authenticated user
    /// </summary>
    /// <returns>List of saved recipes</returns>
    /// <response code="200">Returns the list of saved recipes</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="500">If there was an error fetching saved recipes</response>
    [HttpGet("user/saved-recipes")]
    [Authorize]
    public async Task<ActionResult> GetSavedRecipes()
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            var savedRecipes = await _recipeService.GetSavedRecipesAsync(userId);
            return Ok(savedRecipes);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch saved recipes", message = ex.Message });
        }
    }
}
