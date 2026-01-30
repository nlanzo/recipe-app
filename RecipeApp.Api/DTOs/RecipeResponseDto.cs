namespace RecipeApp.Api.DTOs;

public class RecipeResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; }
    public int TotalTimeInMinutes { get; set; }
    public int NumberOfServings { get; set; }
    public string? ImageUrl { get; set; }
}
