namespace RecipeApp.Api.Services;

public interface IS3Service
{
    Task<string> UploadFileAsync(Stream fileStream, string key);
    Task DeleteFileAsync(string key);
    Task DeleteFilesAsync(List<string> keys);
}
