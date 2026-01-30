namespace RecipeApp.Api.DTOs;

public class RecipeDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public int ActiveTimeInMinutes { get; set; }
    public int TotalTimeInMinutes { get; set; }
    public int NumberOfServings { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<string> Categories { get; set; } = new();
    public List<IngredientDto> Ingredients { get; set; } = new();
    public List<ImageDto> Images { get; set; } = new();
}

public class IngredientDto
{
    public string Name { get; set; } = string.Empty;
    public string Quantity { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
}

public class ImageDto
{
    public string ImageUrl { get; set; } = string.Empty;
    public string? AltText { get; set; }
}
