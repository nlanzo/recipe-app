using Microsoft.AspNetCore.Mvc;
using RecipeApp.Api.DTOs;
using RecipeApp.Api.Services;

namespace RecipeApp.Api.Controllers;

/// <summary>
/// Controller for chat-based recipe recommendations
/// </summary>
[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    /// <summary>
    /// Process a chat message and return recipe recommendations
    /// </summary>
    /// <param name="request">Chat request containing sessionId and messages array</param>
    /// <returns>Assistant's response message</returns>
    /// <response code="200">Returns the assistant's response</response>
    /// <response code="400">If the request is invalid (missing sessionId, empty messages, etc.)</response>
    /// <response code="500">If there was an error processing the chat message</response>
    [HttpPost]
    public async Task<ActionResult<ChatMessageDto>> Chat([FromBody] ChatRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (request.Messages == null || request.Messages.Count == 0)
            {
                return BadRequest(new { error = "Messages array cannot be empty" });
            }

            if (string.IsNullOrWhiteSpace(request.SessionId))
            {
                return BadRequest(new { error = "sessionId is required" });
            }

            var response = await _chatService.ProcessChatAsync(request.SessionId, request.Messages);
            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Chat controller error: {ex.Message}");
            return StatusCode(500, new
            {
                error = "Failed to process chat message",
                details = ex.Message
            });
        }
    }
}
