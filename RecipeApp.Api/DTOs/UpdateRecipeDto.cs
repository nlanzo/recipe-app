using System.ComponentModel.DataAnnotations;

namespace RecipeApp.Api.DTOs;

public class UpdateRecipeDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public string Instructions { get; set; } = string.Empty;

    [Required]
    [Range(0, int.MaxValue)]
    public int ActiveTimeInMinutes { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int TotalTimeInMinutes { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int NumberOfServings { get; set; }

    // Categories and Ingredients come as JSON strings in form-data
    // They will be parsed in the controller before validation
    public List<string> Categories { get; set; } = new();

    public List<CreateIngredientDto> Ingredients { get; set; } = new();
}
