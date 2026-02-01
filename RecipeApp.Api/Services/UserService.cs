using Microsoft.EntityFrameworkCore;
using RecipeApp.Api.Data;
using RecipeApp.Api.Data.Entities;
using RecipeApp.Api.DTOs;

namespace RecipeApp.Api.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;
    private readonly IS3Service _s3Service;
    private readonly IRecipeService _recipeService;

    public UserService(ApplicationDbContext context, IS3Service s3Service, IRecipeService recipeService)
    {
        _context = context;
        _s3Service = s3Service;
        _recipeService = recipeService;
    }

    public async Task<UserProfileDto> GetUserProfileAsync(int userId)
    {
        var user = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserProfileDto
            {
                Username = u.Username,
                Email = u.Email,
                IsAdmin = u.IsAdmin
            })
            .FirstOrDefaultAsync();

        if (user == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        return user;
    }

    public async Task UpdatePasswordAsync(int userId, string currentPassword, string newPassword)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        // Verify current password
        var isValidPassword = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);
        if (!isValidPassword)
        {
            throw new UnauthorizedAccessException("Current password is incorrect");
        }

        // Hash new password
        var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, 10);

        // Update password in database
        user.PasswordHash = newPasswordHash;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteUserAsync(int userId, int adminUserId)
    {
        // Prevent self-deletion
        if (userId == adminUserId)
        {
            throw new InvalidOperationException("You cannot delete your own account");
        }

        // Get the user to delete
        var userToDelete = await _context.Users
            .Include(u => u.Recipes)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (userToDelete == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        // Prevent deleting other admins
        if (userToDelete.IsAdmin)
        {
            throw new UnauthorizedAccessException("Cannot delete admin users");
        }

        // Get admin user for verification
        var adminUser = await _context.Users.FindAsync(adminUserId);
        if (adminUser == null || !adminUser.IsAdmin)
        {
            throw new UnauthorizedAccessException("Only admins can delete users");
        }

        // Step 1: Delete all recipes owned by this user
        // Each DeleteRecipeAsync manages its own transaction, so we can't wrap this in a transaction
        var userRecipes = await _context.Recipes
            .Where(r => r.UserId == userId)
            .Select(r => r.Id)
            .ToListAsync();

        foreach (var recipeId in userRecipes)
        {
            // Use the existing recipe deletion logic which handles all cascading deletes
            // Each call manages its own transaction
            await _recipeService.DeleteRecipeAsync(recipeId, adminUserId);
        }

        // Step 2: Delete saved recipes (recipes saved BY this user)
        // Note: SavedRecipes have cascade delete, but we'll delete explicitly for clarity
        var savedRecipes = await _context.SavedRecipes
            .Where(sr => sr.UserId == userId)
            .ToListAsync();
        _context.SavedRecipes.RemoveRange(savedRecipes);
        await _context.SaveChangesAsync();

        // Step 3: Delete the user
        _context.Users.Remove(userToDelete);
        await _context.SaveChangesAsync();
    }
}
