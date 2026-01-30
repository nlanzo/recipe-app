using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeApp.Api.DTOs;
using RecipeApp.Api.Services;
using System.Security.Claims;

namespace RecipeApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecipesController : ControllerBase
{
    private readonly IRecipeService _recipeService;

    public RecipesController(IRecipeService recipeService)
    {
        _recipeService = recipeService;
    }

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

    [HttpPost]
    [Authorize]
    public async Task<ActionResult> CreateRecipe(
        [FromForm] CreateRecipeDto dto,
        [FromForm] List<IFormFile> images)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "User ID is required" });
            }

            // Parse JSON strings from form data
            if (dto.Categories.Count == 0 && Request.Form.ContainsKey("categories"))
            {
                var categoriesJson = Request.Form["categories"].ToString();
                if (!string.IsNullOrEmpty(categoriesJson))
                {
                    dto.Categories = System.Text.Json.JsonSerializer.Deserialize<List<string>>(categoriesJson) ?? new List<string>();
                }
            }

            if (dto.Ingredients.Count == 0 && Request.Form.ContainsKey("ingredients"))
            {
                var ingredientsJson = Request.Form["ingredients"].ToString();
                if (!string.IsNullOrEmpty(ingredientsJson))
                {
                    dto.Ingredients = System.Text.Json.JsonSerializer.Deserialize<List<CreateIngredientDto>>(ingredientsJson) ?? new List<CreateIngredientDto>();
                }
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

    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult> UpdateRecipe(
        int id,
        [FromForm] UpdateRecipeDto dto,
        [FromForm] List<IFormFile>? newImages = null,
        [FromForm] string? removedImages = null)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            // Parse JSON strings from form data
            if (dto.Categories.Count == 0 && Request.Form.ContainsKey("categories"))
            {
                var categoriesJson = Request.Form["categories"].ToString();
                if (!string.IsNullOrEmpty(categoriesJson))
                {
                    dto.Categories = System.Text.Json.JsonSerializer.Deserialize<List<string>>(categoriesJson) ?? new List<string>();
                }
            }

            if (dto.Ingredients.Count == 0 && Request.Form.ContainsKey("ingredients"))
            {
                var ingredientsJson = Request.Form["ingredients"].ToString();
                if (!string.IsNullOrEmpty(ingredientsJson))
                {
                    dto.Ingredients = System.Text.Json.JsonSerializer.Deserialize<List<CreateIngredientDto>>(ingredientsJson) ?? new List<CreateIngredientDto>();
                }
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
