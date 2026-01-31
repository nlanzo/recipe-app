using Microsoft.EntityFrameworkCore;
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
app.UseMiddleware<JwtAuthMiddleware>(); // Keep for backward compatibility, but authentication is handled by the scheme
app.UseAuthorization();
app.MapControllers();

app.Run();
