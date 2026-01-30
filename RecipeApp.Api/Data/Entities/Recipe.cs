using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("recipes")]
public class Recipe
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [Column("description", TypeName = "text")]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Column("instructions", TypeName = "text")]
    public string Instructions { get; set; } = string.Empty;

    [Column("active_time_in_minutes")]
    public int ActiveTimeInMinutes { get; set; }

    [Column("total_time_in_minutes")]
    public int TotalTimeInMinutes { get; set; }

    [Column("number_of_servings")]
    public int NumberOfServings { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
    public ICollection<RecipeCategory> RecipeCategories { get; set; } = new List<RecipeCategory>();
    public ICollection<Image> Images { get; set; } = new List<Image>();
    public ICollection<SavedRecipe> SavedRecipes { get; set; } = new List<SavedRecipe>();
}
