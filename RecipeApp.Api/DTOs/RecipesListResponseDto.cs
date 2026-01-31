namespace RecipeApp.Api.DTOs;

/// <summary>
/// Response DTO for recipes list endpoints that matches the Node.js API format
/// </summary>
public class RecipesListResponseDto
{
    public List<RecipeResponseDto> Recipes { get; set; } = new();
    public PaginationInfo Pagination { get; set; } = new();
}

public class PaginationInfo
{
    public int Total { get; set; }
    public bool HasMore { get; set; }
    public int CurrentPage { get; set; }
    public int TotalPages { get; set; }
}
