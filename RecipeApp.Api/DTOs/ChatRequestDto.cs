using System.ComponentModel.DataAnnotations;

namespace RecipeApp.Api.DTOs;

public class ChatRequestDto
{
    [Required]
    [StringLength(100, ErrorMessage = "SessionId cannot exceed 100 characters")]
    public string SessionId { get; set; } = string.Empty;

    [Required]
    [MinLength(1, ErrorMessage = "Messages array cannot be empty")]
    [MaxLength(50, ErrorMessage = "Messages array cannot exceed 50 messages")]
    public List<ChatMessageDto> Messages { get; set; } = new();
}
