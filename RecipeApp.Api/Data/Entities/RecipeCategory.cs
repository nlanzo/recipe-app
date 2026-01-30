using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("recipe_categories")]
public class RecipeCategory
{
    [Column("recipe_id")]
    public int RecipeId { get; set; }

    [Column("category_id")]
    public int CategoryId { get; set; }

    // Navigation properties
    public Recipe Recipe { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
