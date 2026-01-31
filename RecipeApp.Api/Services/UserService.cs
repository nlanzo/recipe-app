using Microsoft.EntityFrameworkCore;
using RecipeApp.Api.Data;
using RecipeApp.Api.Data.Entities;
using RecipeApp.Api.DTOs;

namespace RecipeApp.Api.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _context;

    public UserService(ApplicationDbContext context)
    {
        _context = context;
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
}
