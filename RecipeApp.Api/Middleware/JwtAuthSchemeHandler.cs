using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace RecipeApp.Api.Middleware;

public class JwtAuthSchemeHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IConfiguration _configuration;

    public JwtAuthSchemeHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder,
        IConfiguration configuration)
        : base(options, logger, encoder)
    {
        _configuration = configuration;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var token = Request.Headers["Authorization"]
            .FirstOrDefault()?.Split(" ").Last();

        if (string.IsNullOrEmpty(token))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var jwtSecret = _configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured");
            var key = Encoding.ASCII.GetBytes(jwtSecret);

            // Log token extraction for debugging
            Logger.LogDebug("Attempting to validate token. Token length: {TokenLength}", token?.Length ?? 0);

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;
            
            // Check if userId claim exists
            var userIdClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "userId");
            if (userIdClaim == null)
            {
                Logger.LogWarning("Token is valid but missing 'userId' claim. Available claims: {Claims}", 
                    string.Join(", ", jwtToken.Claims.Select(c => c.Type)));
                return Task.FromResult(AuthenticateResult.Fail("Token missing required 'userId' claim"));
            }

            var userId = userIdClaim.Value;
            Logger.LogDebug("Successfully authenticated user with ID: {UserId}", userId);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId)
            };

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
        catch (SecurityTokenExpiredException ex)
        {
            Logger.LogWarning("Token validation failed: Token expired. {Error}", ex.Message);
            return Task.FromResult(AuthenticateResult.Fail("Token expired"));
        }
        catch (SecurityTokenInvalidSignatureException ex)
        {
            Logger.LogWarning("Token validation failed: Invalid signature. {Error}", ex.Message);
            return Task.FromResult(AuthenticateResult.Fail("Invalid token signature"));
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Token validation failed: {Error}", ex.Message);
            return Task.FromResult(AuthenticateResult.Fail($"Invalid token: {ex.Message}"));
        }
    }
}
