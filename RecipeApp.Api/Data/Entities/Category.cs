using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RecipeApp.Api.Data.Entities;

[Table("categories")]
public class Category
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<RecipeCategory> RecipeCategories { get; set; } = new List<RecipeCategory>();
}
