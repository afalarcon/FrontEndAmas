using Amas.Application.Categories;

namespace Amas.Application.Catalogs;

public sealed record CatalogCategoryDto(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    bool IsActive,
    IReadOnlyList<CategoryImageDto> Images);

public sealed record CatalogImagesGroupDto(
    Guid CategoryId,
    string CategoryName,
    string CategorySlug,
    IReadOnlyList<CategoryImageDto> Images);

public sealed record CatalogWarmupDto(
    int Categories,
    int Images,
    DateTimeOffset CachedAt);
