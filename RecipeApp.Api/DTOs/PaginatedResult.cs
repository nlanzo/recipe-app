namespace RecipeApp.Api.DTOs;

public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int Total { get; set; }
    public bool HasMore { get; set; }
    public int CurrentPage { get; set; }
    public int TotalPages { get; set; }
}
