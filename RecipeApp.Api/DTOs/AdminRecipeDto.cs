namespace RecipeApp.Api.DTOs;

public class AdminRecipeDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int TotalTimeInMinutes { get; set; }
    public int NumberOfServings { get; set; }
    public int UserId { get; set; }
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; }
}
