namespace Amas.Application.Products;

public sealed record ProductDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    string? Sku,
    decimal Price,
    bool IsActive,
    Guid? CategoryId,
    string? CategoryName,
    IReadOnlyList<string> ImageUrls);

public sealed record CreateProductRequest(
    string Name,
    string? Slug,
    string? Description,
    string? Sku,
    decimal Price,
    bool IsActive,
    Guid? CategoryId);

public sealed record UpdateProductRequest(
    string Name,
    string? Slug,
    string? Description,
    string? Sku,
    decimal Price,
    bool IsActive,
    Guid? CategoryId);
