using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;

namespace RecipeApp.Api.Services;

public class S3Service : IS3Service
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string _region;

    public S3Service(IConfiguration configuration)
    {
        var region = Amazon.RegionEndpoint.GetBySystemName(configuration["AWS:Region"] ?? "us-east-2");
        _s3Client = new AmazonS3Client(
            configuration["AWS:AccessKeyId"],
            configuration["AWS:SecretAccessKey"],
            region
        );
        _bucketName = configuration["AWS:S3BucketName"] ?? throw new InvalidOperationException("S3BucketName is not configured");
        _region = configuration["AWS:Region"] ?? "us-east-2";
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string key)
    {
        try
        {
            var request = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = key,
                InputStream = fileStream
            };

            await _s3Client.PutObjectAsync(request);
            return $"https://{_bucketName}.s3.{_region}.amazonaws.com/{key}";
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to upload file to S3: {ex.Message}", ex);
        }
    }

    public async Task DeleteFileAsync(string key)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = key
            };
            await _s3Client.DeleteObjectAsync(request);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to delete file from S3: {ex.Message}", ex);
        }
    }

    public async Task DeleteFilesAsync(List<string> keys)
    {
        if (keys.Count == 0) return;

        try
        {
            var request = new DeleteObjectsRequest
            {
                BucketName = _bucketName,
                Objects = keys.Select(k => new KeyVersion { Key = k }).ToList()
            };
            await _s3Client.DeleteObjectsAsync(request);
        }
        catch (Exception ex)
        {
            throw new Exception($"Failed to delete files from S3: {ex.Message}", ex);
        }
    }
}
