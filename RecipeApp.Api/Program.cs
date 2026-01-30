using Microsoft.EntityFrameworkCore;
using RecipeApp.Api.Data;
using RecipeApp.Api.Middleware;
using RecipeApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseMiddleware<JwtAuthMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();
