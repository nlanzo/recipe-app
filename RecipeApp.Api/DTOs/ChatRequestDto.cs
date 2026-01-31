using System.ComponentModel.DataAnnotations;

namespace RecipeApp.Api.DTOs;

public class ChatRequestDto
{
    [Required]
    public string SessionId { get; set; } = string.Empty;

    [Required]
    [MinLength(1, ErrorMessage = "Messages array cannot be empty")]
    public List<ChatMessageDto> Messages { get; set; } = new();
}
