using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApp.Api.Data;

namespace RecipeApp.Api.Attributes;

/// <summary>
/// Authorization attribute that requires the user to be an admin
/// </summary>
public class AdminAuthorizeAttribute : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var userIdClaim = context.HttpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            context.Result = new UnauthorizedObjectResult(new { error = "Authentication required" });
            return;
        }

        // Get DbContext from service provider
        var dbContext = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();

        // Check if user is admin
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !user.IsAdmin)
        {
            context.Result = new ObjectResult(new { error = "Admin access required" })
            {
                StatusCode = 403
            };
            return;
        }
    }
}
