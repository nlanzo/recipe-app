using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("username")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("reset_token_hash")]
    public string? ResetTokenHash { get; set; }

    [Column("reset_token_expiry")]
    public DateTime? ResetTokenExpiry { get; set; }

    [Column("is_admin")]
    public bool IsAdmin { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();
    public ICollection<SavedRecipe> SavedRecipes { get; set; } = new List<SavedRecipe>();
}
