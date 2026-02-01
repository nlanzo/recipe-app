using RecipeApp.Api.DTOs;

namespace RecipeApp.Api.Services;

public interface IUserService
{
    Task<UserProfileDto> GetUserProfileAsync(int userId);
    Task UpdatePasswordAsync(int userId, string currentPassword, string newPassword);
    Task DeleteUserAsync(int userId, int adminUserId);
}
