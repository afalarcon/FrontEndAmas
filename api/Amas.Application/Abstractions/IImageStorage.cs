namespace Amas.Application.Abstractions;

public interface IImageStorage
{
    Task<StoredImageFile> SaveAsync(ImageStorageRequest request, CancellationToken cancellationToken);
}

public sealed record ImageStorageRequest(
    string Container,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    Stream Content);

public sealed record StoredImageFile(
    string Url,
    string StoragePath,
    string StorageProvider,
    string FileName,
    string ContentType,
    long SizeBytes);
