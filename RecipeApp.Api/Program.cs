using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;
using RecipeApp.Api.Data;
using RecipeApp.Api.Middleware;
using RecipeApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Include XML comments for Swagger documentation
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

// Configure CORS
var frontendUrl = builder.Configuration["FrontendUrl"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(frontendUrl)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure Entity Framework Core
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register services
builder.Services.AddScoped<IS3Service, S3Service>();
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IChatService, ChatService>();

// Configure Rate Limiting
var globalLimit = builder.Configuration.GetValue<int>("RateLimiting:Global:PermitLimit", 100);
var globalWindowMinutes = builder.Configuration.GetValue<int>("RateLimiting:Global:WindowMinutes", 1);
var chatLimit = builder.Configuration.GetValue<int>("RateLimiting:Chat:PermitLimit", 10);
var chatWindowMinutes = builder.Configuration.GetValue<int>("RateLimiting:Chat:WindowMinutes", 1);
var chatQueueLimit = builder.Configuration.GetValue<int>("RateLimiting:Chat:QueueLimit", 2);

builder.Services.AddRateLimiter(options =>
{
    // Global rate limiter - applies to all endpoints by default
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.IsAuthenticated == true
                ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous"
                : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = globalLimit,
                Window = TimeSpan.FromMinutes(globalWindowMinutes)
            }));

    // Chat-specific rate limiter - stricter limits for chat endpoint
    options.AddFixedWindowLimiter("ChatPolicy", limiterOptions =>
    {
        limiterOptions.PermitLimit = chatLimit;
        limiterOptions.Window = TimeSpan.FromMinutes(chatWindowMinutes);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = chatQueueLimit;
    });

    // Rate limit rejection response
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = 429; // Too Many Requests
        var retryAfterSeconds = chatWindowMinutes * 60;
        context.HttpContext.Response.Headers.RetryAfter = retryAfterSeconds.ToString();
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Rate limit exceeded",
            message = "Too many requests. Please try again later.",
            retryAfter = retryAfterSeconds
        }, cancellationToken);
    };
});

// Ensure JWT secret is loaded from environment variables (for development)
// This allows the .NET API to use the same JWT_SECRET as the Node.js server
// Environment variables take precedence over appsettings.json
var jwtSecretFromEnv = Environment.GetEnvironmentVariable("JWT_SECRET");
if (!string.IsNullOrEmpty(jwtSecretFromEnv))
{
    builder.Configuration["Jwt:Secret"] = jwtSecretFromEnv;
    Console.WriteLine("Using JWT_SECRET from environment variable");
}
else
{
    Console.WriteLine($"Using JWT_SECRET from config: {builder.Configuration["Jwt:Secret"]?.Substring(0, Math.Min(10, builder.Configuration["Jwt:Secret"]?.Length ?? 0))}...");
}

// Configure Authentication
// Since we're using custom JWT middleware, we need to configure a default authentication scheme
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = "JWT";
    options.DefaultChallengeScheme = "JWT";
})
.AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, JwtAuthSchemeHandler>(
    "JWT", options => { });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.DocumentTitle = "Recipe App API - Swagger UI";
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Recipe App API v1");
    });
}

// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowFrontend");
app.UseAuthentication(); // Must come before UseAuthorization
app.UseAuthorization();
app.UseRateLimiter(); // Enable rate limiting middleware
app.MapControllers();

app.Run();
