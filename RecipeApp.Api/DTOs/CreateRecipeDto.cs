using System.ComponentModel.DataAnnotations;

namespace RecipeApp.Api.DTOs;

public class CreateRecipeDto
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
    public int ActiveTime { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int TotalTime { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int Servings { get; set; }

    [Required]
    [MinLength(1)]
    public List<string> Categories { get; set; } = new();

    [Required]
    [MinLength(1)]
    public List<CreateIngredientDto> Ingredients { get; set; } = new();
}

public class CreateIngredientDto
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Quantity { get; set; } = string.Empty;

    [Required]
    public string Unit { get; set; } = string.Empty;
}
