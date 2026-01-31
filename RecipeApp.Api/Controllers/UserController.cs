using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RecipeApp.Api.DTOs;
using RecipeApp.Api.Services;

namespace RecipeApp.Api.Controllers;

/// <summary>
/// Controller for user-related endpoints
/// </summary>
[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly IRecipeService _recipeService;
    private readonly IUserService _userService;

    public UserController(IRecipeService recipeService, IUserService userService)
    {
        _recipeService = recipeService;
        _userService = userService;
    }

    /// <summary>
    /// Get all recipes created by the authenticated user
    /// </summary>
    /// <returns>List of recipes created by the user</returns>
    /// <response code="200">Returns the list of user's recipes</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="500">If there was an error fetching recipes</response>
    [HttpGet("my-recipes")]
    [Authorize]
    public async Task<ActionResult> GetMyRecipes()
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            var recipes = await _recipeService.GetMyRecipesAsync(userId);
            return Ok(recipes);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch user's recipes", message = ex.Message });
        }
    }

    /// <summary>
    /// Get the authenticated user's profile information
    /// </summary>
    /// <returns>User profile data (username, email, isAdmin)</returns>
    /// <response code="200">Returns the user profile</response>
    /// <response code="401">If the user is not authenticated</response>
    /// <response code="404">If the user is not found</response>
    /// <response code="500">If there was an error fetching the profile</response>
    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            var profile = await _userService.GetUserProfileAsync(userId);
            return Ok(profile);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to fetch user profile", message = ex.Message });
        }
    }

    /// <summary>
    /// Update the authenticated user's password
    /// </summary>
    /// <param name="request">Password update request containing currentPassword and newPassword</param>
    /// <returns>Success message</returns>
    /// <response code="200">Password updated successfully</response>
    /// <response code="400">If the request is invalid</response>
    /// <response code="401">If the user is not authenticated or current password is incorrect</response>
    /// <response code="404">If the user is not found</response>
    /// <response code="500">If there was an error updating the password</response>
    [HttpPut("password")]
    [Authorize]
    public async Task<ActionResult> UpdatePassword([FromBody] UpdatePasswordDto request)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { error = "Authentication required" });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await _userService.UpdatePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
            return Ok(new { message = "Password updated successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Failed to update password", message = ex.Message });
        }
    }
}
