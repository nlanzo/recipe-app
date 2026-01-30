using Microsoft.EntityFrameworkCore;
using RecipeApp.Api.Data.Entities;

namespace RecipeApp.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Recipe> Recipes { get; set; }
    public DbSet<Ingredient> Ingredients { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<Image> Images { get; set; }
    public DbSet<SavedRecipe> SavedRecipes { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<RecipeIngredient> RecipeIngredients { get; set; }
    public DbSet<RecipeCategory> RecipeCategories { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Recipe -> User relationship
        modelBuilder.Entity<Recipe>()
            .HasOne(r => r.User)
            .WithMany(u => u.Recipes)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure RecipeIngredient relationships
        modelBuilder.Entity<RecipeIngredient>()
            .HasOne(ri => ri.Recipe)
            .WithMany(r => r.RecipeIngredients)
            .HasForeignKey(ri => ri.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RecipeIngredient>()
            .HasOne(ri => ri.Ingredient)
            .WithMany(i => i.RecipeIngredients)
            .HasForeignKey(ri => ri.IngredientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RecipeIngredient>()
            .HasOne(ri => ri.Unit)
            .WithMany(u => u.RecipeIngredients)
            .HasForeignKey(ri => ri.UnitId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure RecipeCategory relationships
        modelBuilder.Entity<RecipeCategory>()
            .HasKey(rc => new { rc.RecipeId, rc.CategoryId });

        modelBuilder.Entity<RecipeCategory>()
            .HasOne(rc => rc.Recipe)
            .WithMany(r => r.RecipeCategories)
            .HasForeignKey(rc => rc.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RecipeCategory>()
            .HasOne(rc => rc.Category)
            .WithMany(c => c.RecipeCategories)
            .HasForeignKey(rc => rc.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure Image -> Recipe relationship
        modelBuilder.Entity<Image>()
            .HasOne(i => i.Recipe)
            .WithMany(r => r.Images)
            .HasForeignKey(i => i.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure SavedRecipe relationships
        modelBuilder.Entity<SavedRecipe>()
            .HasOne(sr => sr.User)
            .WithMany(u => u.SavedRecipes)
            .HasForeignKey(sr => sr.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SavedRecipe>()
            .HasOne(sr => sr.Recipe)
            .WithMany(r => r.SavedRecipes)
            .HasForeignKey(sr => sr.RecipeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Configure unique index on SavedRecipe (user_id, recipe_id)
        modelBuilder.Entity<SavedRecipe>()
            .HasIndex(sr => new { sr.UserId, sr.RecipeId })
            .IsUnique();

        // Configure unique constraint on Category name
        modelBuilder.Entity<Category>()
            .HasIndex(c => c.Name)
            .IsUnique();

        // Configure indexes for performance
        modelBuilder.Entity<Recipe>()
            .HasIndex(r => r.UserId);

        modelBuilder.Entity<Image>()
            .HasIndex(i => new { i.RecipeId, i.IsPrimary });
    }
}
