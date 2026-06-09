namespace Amas.Application.Categories;

public sealed record CategoryImageDto(
    Guid Id,
    Guid CategoryId,
    string Url,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? AltText,
    int SortOrder,
    string StorageProvider);

public sealed record UploadCategoryImageFile(
    string FileName,
    string ContentType,
    long SizeBytes,
    Stream Content,
    string? AltText);
