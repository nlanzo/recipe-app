using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("recipe_ingredients")]
public class RecipeIngredient
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("recipe_id")]
    public int RecipeId { get; set; }

    [Column("ingredient_id")]
    public int IngredientId { get; set; }

    [Column("unit_id")]
    public int UnitId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("quantity")]
    public string Quantity { get; set; } = string.Empty;

    // Navigation properties
    public Recipe Recipe { get; set; } = null!;
    public Ingredient Ingredient { get; set; } = null!;
    public Unit Unit { get; set; } = null!;
}
