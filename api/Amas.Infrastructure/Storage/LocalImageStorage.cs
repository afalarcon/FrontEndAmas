using Amas.Application.Abstractions;
using Microsoft.Extensions.Options;

namespace Amas.Infrastructure.Storage;

public sealed class LocalImageStorage(IOptions<MediaStorageOptions> options) : IImageStorage
{
    private readonly MediaStorageOptions storageOptions = options.Value;

    public async Task<StoredImageFile> SaveAsync(ImageStorageRequest request, CancellationToken cancellationToken)
    {
        if (!string.Equals(storageOptions.Provider, "Local", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Media storage provider '{storageOptions.Provider}' is not supported yet.");
        }

        if (request.SizeBytes > storageOptions.MaxFileBytes)
        {
            throw new InvalidOperationException($"Image '{request.OriginalFileName}' exceeds the configured max size.");
        }

        if (!storageOptions.AllowedContentTypes.Contains(request.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Image '{request.OriginalFileName}' has unsupported content type '{request.ContentType}'.");
        }

        var extension = GetExtension(request.OriginalFileName, request.ContentType);
        var safeName = $"{DateTimeOffset.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}{extension}";
        var safeContainer = NormalizeContainer(request.Container);
        var rootPath = GetRootPath(storageOptions.LocalPath);
        var targetDirectory = Path.Combine(rootPath, safeContainer);

        Directory.CreateDirectory(targetDirectory);

        var fullPath = Path.Combine(targetDirectory, safeName);
        await using (var target = File.Create(fullPath))
        {
            await request.Content.CopyToAsync(target, cancellationToken);
        }

        var relativePath = $"{safeContainer}/{safeName}".Replace('\\', '/');
        var publicBaseUrl = storageOptions.PublicBaseUrl.TrimEnd('/');

        return new StoredImageFile(
            $"{publicBaseUrl}/{relativePath}",
            relativePath,
            "Local",
            safeName,
            request.ContentType,
            request.SizeBytes);
    }

    public static string GetRootPath(string configuredPath)
    {
        return Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), configuredPath));
    }

    private static string NormalizeContainer(string container)
    {
        var parts = container
            .Split(['/', '\\'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(part => part is not "." and not "..")
            .Select(part => string.Concat(part.Where(IsSafePathCharacter)));

        var normalized = string.Join(Path.DirectorySeparatorChar, parts);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new InvalidOperationException("Storage container is required.");
        }

        return normalized;
    }

    private static string GetExtension(string fileName, string contentType)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (extension is ".jpg" or ".jpeg" or ".png" or ".webp")
        {
            return extension;
        }

        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => throw new InvalidOperationException($"Unsupported image content type '{contentType}'.")
        };
    }

    private static bool IsSafePathCharacter(char character) =>
        char.IsLetterOrDigit(character) || character is '-' or '_' or '.';
}
