using System.ComponentModel.DataAnnotations;

namespace RecipeApp.Api.DTOs;

public class ChatMessageDto
{
    [Required]
    [RegularExpression("^(system|user|assistant)$", ErrorMessage = "Role must be 'system', 'user', or 'assistant'")]
    public string Role { get; set; } = string.Empty; // "system", "user", or "assistant"
    
    [Required]
    [StringLength(5000, ErrorMessage = "Message content cannot exceed 5000 characters")]
    public string Content { get; set; } = string.Empty;
}
