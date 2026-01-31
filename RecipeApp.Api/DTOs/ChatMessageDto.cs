namespace RecipeApp.Api.DTOs;

public class ChatMessageDto
{
    public string Role { get; set; } = string.Empty; // "system", "user", or "assistant"
    public string Content { get; set; } = string.Empty;
}
