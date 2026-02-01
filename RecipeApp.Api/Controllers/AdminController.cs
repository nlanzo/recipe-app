using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RecipeApp.Api.Attributes;
using RecipeApp.Api.Data;
using RecipeApp.Api.DTOs;
using RecipeApp.Api.Services;

namespace RecipeApp.Api.Controllers;

/// <summary>
/// Controller for admin-only endpoints
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IRecipeService _recipeService;
    private readonly IS3Service _s3Service;

    public AdminController(ApplicationDbContext context, IRecipeService recipeService, IS3Service s3Service)
    {
        _context = context;
        _recipeService = recipeService;
        _s3Service = s3Service;
    }

    /// <summary>
    /// Get all recipes with pagination and search (admin only)
    /// </summary>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="limit">Items per page (default: 10)</param>
    /// <param name="search">Optional search term to filter recipes by title or description</param>
    /// <returns>Paginated list of recipes</returns>
    /// <response code="200">Returns the paginated list of recipes</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not an admin</response>
    /// <response code="500">If there was an error fetching recipes</response>
    [HttpGet("recipes")]
    [AdminAuthorize]
    public async Task<ActionResult> GetRecipes([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? search = null)
    {
        try
        {
            page = Math.Max(1, page);
            limit = Math.Max(1, limit);
            var offset = (page - 1) * limit;

            var query = _context.Recipes
                .Include(r => r.User)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(r =>
                    r.Title.ToLower().Contains(searchLower) ||
                    r.Description.ToLower().Contains(searchLower));
            }

            var total = await query.CountAsync();
            var recipes = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(r => new AdminRecipeDto
                {
                    Id = r.Id,
                    Title = r.Title,
                    Description = r.Description,
                    TotalTimeInMinutes = r.TotalTimeInMinutes,
                    NumberOfServings = r.NumberOfServings,
                    UserId = r.UserId,
                    Username = r.User.Username,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                recipes,
                total,
                currentPage = page,
                totalPages = (int)Math.Ceiling(total / (double)limit)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch recipes", message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a recipe (admin can delete any recipe)
    /// </summary>
    /// <param name="id">The recipe ID to delete</param>
    /// <returns>Success message</returns>
    /// <response code="200">Recipe deleted successfully</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not an admin</response>
    /// <response code="404">If the recipe is not found</response>
    /// <response code="500">If there was an error deleting the recipe</response>
    [HttpDelete("recipes/{id}")]
    [AdminAuthorize]
    public async Task<ActionResult> DeleteRecipe(int id)
    {
        try
        {
            // Admin can delete any recipe, so we don't need to check ownership
            // Just use the existing DeleteRecipeAsync but with admin privileges
            // We'll need to get the admin user ID from the claims
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var adminUserId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            // Use the existing delete method which handles all the cleanup
            await _recipeService.DeleteRecipeAsync(id, adminUserId);
            return Ok(new { message = "Recipe deleted successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            // This shouldn't happen for admin, but handle it just in case
            return StatusCode(403, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to delete recipe", message = ex.Message });
        }
    }

    /// <summary>
    /// Get all users with pagination and search (admin only)
    /// </summary>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="limit">Items per page (default: 10)</param>
    /// <param name="search">Optional search term to filter users by username or email</param>
    /// <returns>Paginated list of users</returns>
    /// <response code="200">Returns the paginated list of users</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not an admin</response>
    /// <response code="500">If there was an error fetching users</response>
    [HttpGet("users")]
    [AdminAuthorize]
    public async Task<ActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? search = null)
    {
        try
        {
            page = Math.Max(1, page);
            limit = Math.Max(1, limit);
            var offset = (page - 1) * limit;

            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(u =>
                    u.Username.ToLower().Contains(searchLower) ||
                    u.Email.ToLower().Contains(searchLower));
            }

            var total = await query.CountAsync();
            var users = await query
                .OrderBy(u => u.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(u => new AdminUserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    CreatedAt = u.CreatedAt,
                    IsAdmin = u.IsAdmin
                })
                .ToListAsync();

            return Ok(new
            {
                users,
                total,
                currentPage = page,
                totalPages = (int)Math.Ceiling(total / (double)limit)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch users", message = ex.Message });
        }
    }

    /// <summary>
    /// Get recipes for a specific user (admin only)
    /// </summary>
    /// <param name="userId">The user ID</param>
    /// <param name="page">Page number (default: 1)</param>
    /// <param name="limit">Items per page (default: 10)</param>
    /// <returns>Paginated list of recipes for the user</returns>
    /// <response code="200">Returns the paginated list of recipes</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not an admin</response>
    /// <response code="500">If there was an error fetching recipes</response>
    [HttpGet("users/{userId}/recipes")]
    [AdminAuthorize]
    public async Task<ActionResult> GetUserRecipes(int userId, [FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        try
        {
            page = Math.Max(1, page);
            limit = Math.Max(1, limit);
            var offset = (page - 1) * limit;

            var query = _context.Recipes
                .Include(r => r.User)
                .Where(r => r.UserId == userId);

            var total = await query.CountAsync();
            var recipes = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(r => new AdminRecipeDto
                {
                    Id = r.Id,
                    Title = r.Title,
                    Description = r.Description,
                    TotalTimeInMinutes = r.TotalTimeInMinutes,
                    NumberOfServings = r.NumberOfServings,
                    UserId = r.UserId,
                    Username = r.User.Username,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                recipes,
                total,
                currentPage = page,
                totalPages = (int)Math.Ceiling(total / (double)limit)
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch user recipes", message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a user (admin only)
    /// </summary>
    /// <param name="id">The user ID to delete</param>
    /// <param name="userService">The user service instance</param>
    /// <returns>Success message</returns>
    /// <response code="200">User deleted successfully</response>
    /// <response code="400">If attempting to delete yourself or another admin</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="403">If the user is not an admin</response>
    /// <response code="404">If the user is not found</response>
    /// <response code="500">If there was an error deleting the user</response>
    [HttpDelete("users/{id}")]
    [AdminAuthorize]
    public async Task<ActionResult> DeleteUser(int id, [FromServices] IUserService userService)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var adminUserId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            await userService.DeleteUserAsync(id, adminUserId);
            return Ok(new { message = "User deleted successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to delete user", message = ex.Message });
        }
    }
}
