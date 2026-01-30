using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("saved_recipes")]
public class SavedRecipe
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("user_id")]
    public int UserId { get; set; }

    [Column("recipe_id")]
    public int RecipeId { get; set; }

    [Column("saved_at")]
    public DateTime SavedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public Recipe Recipe { get; set; } = null!;
}
