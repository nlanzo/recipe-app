using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("images")]
public class Image
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("recipe_id")]
    public int RecipeId { get; set; }

    [Required]
    [MaxLength(500)]
    [Column("image_url")]
    public string ImageUrl { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("alt_text")]
    public string? AltText { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("is_primary")]
    public bool IsPrimary { get; set; } = false;

    // Navigation properties
    public Recipe Recipe { get; set; } = null!;
}
