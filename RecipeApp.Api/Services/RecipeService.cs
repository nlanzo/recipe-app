using Microsoft.EntityFrameworkCore;
using RecipeApp.Api.Data;
using RecipeApp.Api.Data.Entities;
using RecipeApp.Api.DTOs;
using RecipeApp.Api.Services;

namespace RecipeApp.Api.Services;

public class RecipeService : IRecipeService
{
    private readonly ApplicationDbContext _context;
    private readonly IS3Service _s3Service;
    private const int PageSize = 9;

    public RecipeService(ApplicationDbContext context, IS3Service s3Service)
    {
        _context = context;
        _s3Service = s3Service;
    }

    public async Task<PaginatedResult<RecipeResponseDto>> GetRecipesAsync(int page, string? search, string? sort)
    {
        var offset = (page - 1) * PageSize;

        var query = _context.Recipes
            .Include(r => r.User)
            .Include(r => r.Images.Where(i => i.IsPrimary))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(r => r.Title.ToLower().Contains(search.ToLower()));
        }

        query = sort == "title"
            ? query.OrderBy(r => r.Title).ThenBy(r => r.Id)
            : query.OrderBy(r => r.TotalTimeInMinutes).ThenBy(r => r.Id);

        var total = await query.CountAsync();
        var recipes = await query
            .Skip(offset)
            .Take(PageSize + 1)
            .Select(r => new RecipeResponseDto
            {
                Id = r.Id,
                Title = r.Title,
                Username = r.User.Username,
                CreatedAt = r.CreatedAt,
                TotalTimeInMinutes = r.TotalTimeInMinutes,
                NumberOfServings = r.NumberOfServings,
                ImageUrl = r.Images.FirstOrDefault(i => i.IsPrimary)!.ImageUrl
            })
            .ToListAsync();

        var hasMore = recipes.Count > PageSize;
        var items = recipes.Take(PageSize).ToList();

        return new PaginatedResult<RecipeResponseDto>
        {
            Items = items,
            Total = total,
            HasMore = hasMore,
            CurrentPage = page,
            TotalPages = (int)Math.Ceiling(total / (double)PageSize)
        };
    }

    public async Task<PaginatedResult<RecipeResponseDto>> SearchRecipesAsync(string query, int page, string? sort)
    {
        var offset = (page - 1) * PageSize;
        var searchTerm = query.ToLower();

        var baseQuery = _context.Recipes
            .Include(r => r.Images.Where(i => i.IsPrimary))
            .Where(r =>
                r.Title.ToLower().Contains(searchTerm) ||
                r.Description.ToLower().Contains(searchTerm) ||
                r.Instructions.ToLower().Contains(searchTerm) ||
                r.RecipeIngredients.Any(ri =>
                    ri.Ingredient.Name.ToLower().Contains(searchTerm)
                )
            );

        var sortedQuery = sort == "title"
            ? baseQuery.OrderBy(r => r.Title).ThenBy(r => r.Id)
            : baseQuery.OrderBy(r => r.TotalTimeInMinutes).ThenBy(r => r.Id);

        var total = await sortedQuery.CountAsync();
        var recipes = await sortedQuery
            .Skip(offset)
            .Take(PageSize + 1)
            .Select(r => new RecipeResponseDto
            {
                Id = r.Id,
                Title = r.Title,
                CreatedAt = r.CreatedAt,
                TotalTimeInMinutes = r.TotalTimeInMinutes,
                NumberOfServings = r.NumberOfServings,
                ImageUrl = r.Images.FirstOrDefault(i => i.IsPrimary)!.ImageUrl
            })
            .ToListAsync();

        var hasMore = recipes.Count > PageSize;
        var items = recipes.Take(PageSize).ToList();

        return new PaginatedResult<RecipeResponseDto>
        {
            Items = items,
            Total = total,
            HasMore = hasMore,
            CurrentPage = page,
            TotalPages = (int)Math.Ceiling(total / (double)PageSize)
        };
    }

    public async Task<RecipeDetailDto?> GetRecipeByIdAsync(int id)
    {
        var recipe = await _context.Recipes
            .Include(r => r.User)
            .Include(r => r.RecipeCategories)
                .ThenInclude(rc => rc.Category)
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Ingredient)
            .Include(r => r.RecipeIngredients)
                .ThenInclude(ri => ri.Unit)
            .Include(r => r.Images)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recipe == null)
            return null;

        return new RecipeDetailDto
        {
            Id = recipe.Id,
            Title = recipe.Title,
            Author = recipe.User.Username,
            UserId = recipe.UserId,
            Description = recipe.Description,
            Instructions = recipe.Instructions,
            ActiveTimeInMinutes = recipe.ActiveTimeInMinutes,
            TotalTimeInMinutes = recipe.TotalTimeInMinutes,
            NumberOfServings = recipe.NumberOfServings,
            CreatedAt = recipe.CreatedAt,
            UpdatedAt = recipe.UpdatedAt,
            Categories = recipe.RecipeCategories.Select(rc => rc.Category.Name).ToList(),
            Ingredients = recipe.RecipeIngredients.Select(ri => new IngredientDto
            {
                Name = ri.Ingredient.Name,
                Quantity = ri.Quantity,
                Unit = ri.Unit.Name
            }).ToList(),
            Images = recipe.Images.Select(i => new ImageDto
            {
                ImageUrl = i.ImageUrl,
                AltText = i.AltText
            }).ToList()
        };
    }

    public async Task<int> CreateRecipeAsync(CreateRecipeDto dto, int userId, List<IFormFile> images)
    {
        if (images == null || images.Count == 0)
        {
            throw new ArgumentException("At least one image is required");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Create recipe
            var recipe = new Recipe
            {
                UserId = userId,
                Title = dto.Title,
                Description = dto.Description,
                Instructions = dto.Instructions,
                ActiveTimeInMinutes = dto.ActiveTime,
                TotalTimeInMinutes = dto.TotalTime,
                NumberOfServings = dto.Servings,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            // Handle categories
            foreach (var categoryName in dto.Categories)
            {
                var category = await _context.Categories
                    .FirstOrDefaultAsync(c => c.Name == categoryName);

                if (category == null)
                {
                    category = new Category { Name = categoryName };
                    _context.Categories.Add(category);
                    await _context.SaveChangesAsync();
                }

                _context.RecipeCategories.Add(new RecipeCategory
                {
                    RecipeId = recipe.Id,
                    CategoryId = category.Id
                });
            }

            // Handle ingredients
            foreach (var ingredientDto in dto.Ingredients)
            {
                var ingredient = await _context.Ingredients
                    .FirstOrDefaultAsync(i => i.Name == ingredientDto.Name);

                if (ingredient == null)
                {
                    ingredient = new Ingredient
                    {
                        Name = ingredientDto.Name,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Ingredients.Add(ingredient);
                    await _context.SaveChangesAsync();
                }

                var unit = await _context.Units
                    .FirstOrDefaultAsync(u => u.Name == ingredientDto.Unit);

                if (unit == null)
                {
                    throw new InvalidOperationException($"Invalid unit: {ingredientDto.Unit}");
                }

                _context.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = ingredient.Id,
                    UnitId = unit.Id,
                    Quantity = ingredientDto.Quantity
                });
            }

            // Upload images
            for (int i = 0; i < images.Count; i++)
            {
                var image = images[i];
                var key = $"recipes/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{image.FileName}";

                using var stream = image.OpenReadStream();
                var imageUrl = await _s3Service.UploadFileAsync(stream, key);

                _context.Images.Add(new Image
                {
                    RecipeId = recipe.Id,
                    ImageUrl = imageUrl,
                    AltText = $"Image of {dto.Title}",
                    IsPrimary = i == 0,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return recipe.Id;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task UpdateRecipeAsync(int id, UpdateRecipeDto dto, int userId, List<IFormFile>? newImages, List<string>? removedImages)
    {
        // Check authorization
        var recipe = await _context.Recipes
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recipe == null)
            throw new KeyNotFoundException("Recipe not found");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new UnauthorizedAccessException("User not found");

        var isOwner = recipe.UserId == userId;
        var isAdmin = user.IsAdmin;

        if (!isOwner && !isAdmin)
            throw new UnauthorizedAccessException("Not authorized to edit this recipe");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Update recipe details
            recipe.Title = dto.Title;
            recipe.Description = dto.Description;
            recipe.Instructions = dto.Instructions;
            recipe.ActiveTimeInMinutes = dto.ActiveTimeInMinutes;
            recipe.TotalTimeInMinutes = dto.TotalTimeInMinutes;
            recipe.NumberOfServings = dto.NumberOfServings;
            recipe.UpdatedAt = DateTime.UtcNow;

            // Update categories
            var existingCategories = await _context.RecipeCategories
                .Where(rc => rc.RecipeId == id)
                .ToListAsync();
            _context.RecipeCategories.RemoveRange(existingCategories);

            foreach (var categoryName in dto.Categories)
            {
                var category = await _context.Categories
                    .FirstOrDefaultAsync(c => c.Name == categoryName);

                if (category == null)
                {
                    category = new Category { Name = categoryName };
                    _context.Categories.Add(category);
                    await _context.SaveChangesAsync();
                }

                _context.RecipeCategories.Add(new RecipeCategory
                {
                    RecipeId = id,
                    CategoryId = category.Id
                });
            }

            // Update ingredients
            var existingIngredients = await _context.RecipeIngredients
                .Where(ri => ri.RecipeId == id)
                .ToListAsync();
            _context.RecipeIngredients.RemoveRange(existingIngredients);

            foreach (var ingredientDto in dto.Ingredients)
            {
                var ingredient = await _context.Ingredients
                    .FirstOrDefaultAsync(i => i.Name == ingredientDto.Name);

                if (ingredient == null)
                {
                    ingredient = new Ingredient
                    {
                        Name = ingredientDto.Name,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Ingredients.Add(ingredient);
                    await _context.SaveChangesAsync();
                }

                var unit = await _context.Units
                    .FirstOrDefaultAsync(u => u.Name == ingredientDto.Unit);

                if (unit == null)
                    throw new InvalidOperationException($"Invalid unit: {ingredientDto.Unit}");

                _context.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = id,
                    IngredientId = ingredient.Id,
                    UnitId = unit.Id,
                    Quantity = ingredientDto.Quantity
                });
            }

            // Delete removed images from S3 and database
            if (removedImages != null && removedImages.Count > 0)
            {
                foreach (var imageUrl in removedImages)
                {
                    var key = imageUrl.Split('/').Last();
                    try
                    {
                        await _s3Service.DeleteFileAsync(key);
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue
                        Console.WriteLine($"Error deleting image {key}: {ex.Message}");
                    }

                    var image = await _context.Images
                        .FirstOrDefaultAsync(i => i.ImageUrl == imageUrl);
                    if (image != null)
                    {
                        _context.Images.Remove(image);
                    }
                }
            }

            // Upload new images
            if (newImages != null && newImages.Count > 0)
            {
                for (int i = 0; i < newImages.Count; i++)
                {
                    var image = newImages[i];
                    var key = $"recipes/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{image.FileName}";

                    using var stream = image.OpenReadStream();
                    var imageUrl = await _s3Service.UploadFileAsync(stream, key);

                    _context.Images.Add(new Image
                    {
                        RecipeId = id,
                        ImageUrl = imageUrl,
                        AltText = $"Image of {dto.Title}",
                        IsPrimary = i == 0 && removedImages != null && removedImages.Count > 0, // Set as primary if first new image and old ones were removed
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteRecipeAsync(int id, int userId)
    {
        // Check authorization
        var recipe = await _context.Recipes
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (recipe == null)
            throw new KeyNotFoundException("Recipe not found");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new UnauthorizedAccessException("User not found");

        var isOwner = recipe.UserId == userId;
        var isAdmin = user.IsAdmin;

        if (!isOwner && !isAdmin)
            throw new UnauthorizedAccessException("Not authorized to delete this recipe");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Get all images for deletion from S3
            var images = await _context.Images
                .Where(i => i.RecipeId == id)
                .ToListAsync();

            if (images.Count > 0)
            {
                var keys = images.Select(i => i.ImageUrl.Split('/').Last()).ToList();
                try
                {
                    await _s3Service.DeleteFilesAsync(keys);
                }
                catch (Exception ex)
                {
                    throw new Exception($"Failed to delete images from S3: {ex.Message}", ex);
                }
            }

            // Delete related records (cascade will handle most, but we'll be explicit)
            _context.Images.RemoveRange(images);
            await _context.SaveChangesAsync();

            // Delete recipe (cascade will handle recipe_ingredients and recipe_categories)
            _context.Recipes.Remove(recipe);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
