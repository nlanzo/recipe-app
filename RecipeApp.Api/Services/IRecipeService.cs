using RecipeApp.Api.DTOs;

namespace RecipeApp.Api.Services;

public interface IRecipeService
{
    Task<PaginatedResult<RecipeResponseDto>> GetRecipesAsync(int page, string? search, string? sort);
    Task<PaginatedResult<RecipeResponseDto>> SearchRecipesAsync(string query, int page, string? sort);
    Task<RecipeDetailDto?> GetRecipeByIdAsync(int id);
    Task<int> CreateRecipeAsync(CreateRecipeDto dto, int userId, List<IFormFile> images);
    Task UpdateRecipeAsync(int id, UpdateRecipeDto dto, int userId, List<IFormFile>? newImages, List<string>? removedImages);
    Task DeleteRecipeAsync(int id, int userId);
    Task SaveRecipeAsync(int recipeId, int userId);
    Task UnsaveRecipeAsync(int recipeId, int userId);
    Task<List<RecipeResponseDto>> GetSavedRecipesAsync(int userId);
    Task<List<RecipeResponseDto>> GetMyRecipesAsync(int userId);
}
