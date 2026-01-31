using RecipeApp.Api.DTOs;

namespace RecipeApp.Api.Services;

public interface IChatService
{
    Task<ChatMessageDto> ProcessChatAsync(string sessionId, List<ChatMessageDto> messages);
}
