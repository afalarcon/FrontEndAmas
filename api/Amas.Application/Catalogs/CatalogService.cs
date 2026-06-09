using Amas.Application.Abstractions;
using Amas.Application.Categories;
using Amas.Application.Common;
using Amas.Domain.Core;

namespace Amas.Application.Catalogs;

public sealed class CatalogService(
    ICatalogRepository catalogs,
    ICacheService cache) : ICatalogService
{
    private static readonly TimeSpan CatalogTtl = TimeSpan.FromMinutes(30);

    public async Task<Result<IReadOnlyList<CatalogCategoryDto>>> ListAsync(CancellationToken cancellationToken)
    {
        var cached = await cache.GetAsync<IReadOnlyList<CatalogCategoryDto>>(CacheKeys.Catalogs, cancellationToken);
        if (cached is not null)
        {
            return Result<IReadOnlyList<CatalogCategoryDto>>.Success(cached);
        }

        var categories = await LoadCatalogsAsync(cancellationToken);
        await cache.SetAsync(CacheKeys.Catalogs, categories, CatalogTtl, cancellationToken);

        return Result<IReadOnlyList<CatalogCategoryDto>>.Success(categories);
    }

    public async Task<Result<IReadOnlyList<CatalogImagesGroupDto>>> ListImagesAsync(CancellationToken cancellationToken)
    {
        var cached = await cache.GetAsync<IReadOnlyList<CatalogImagesGroupDto>>(CacheKeys.CatalogImages, cancellationToken);
        if (cached is not null)
        {
            return Result<IReadOnlyList<CatalogImagesGroupDto>>.Success(cached);
        }

        var images = await LoadImagesAsync(cancellationToken);
        await cache.SetAsync(CacheKeys.CatalogImages, images, CatalogTtl, cancellationToken);

        return Result<IReadOnlyList<CatalogImagesGroupDto>>.Success(images);
    }

    public async Task<Result<CatalogWarmupDto>> WarmupAsync(CancellationToken cancellationToken)
    {
        var categories = await LoadCatalogsAsync(cancellationToken);
        var images = BuildImagesGroups(categories);

        await cache.SetAsync(CacheKeys.Catalogs, categories, CatalogTtl, cancellationToken);
        await cache.SetAsync(CacheKeys.CatalogImages, images, CatalogTtl, cancellationToken);

        return Result<CatalogWarmupDto>.Success(new CatalogWarmupDto(
            categories.Count,
            images.Sum(x => x.Images.Count),
            DateTimeOffset.UtcNow));
    }

    private async Task<IReadOnlyList<CatalogCategoryDto>> LoadCatalogsAsync(CancellationToken cancellationToken)
    {
        var categories = await catalogs.ListCategoriesWithImagesAsync(cancellationToken);
        return categories.Select(MapCategory).ToList();
    }

    private async Task<IReadOnlyList<CatalogImagesGroupDto>> LoadImagesAsync(CancellationToken cancellationToken)
    {
        var categories = await LoadCatalogsAsync(cancellationToken);
        return BuildImagesGroups(categories);
    }

    private static IReadOnlyList<CatalogImagesGroupDto> BuildImagesGroups(IReadOnlyList<CatalogCategoryDto> categories) =>
        categories
            .Where(x => x.Images.Count > 0)
            .Select(x => new CatalogImagesGroupDto(x.Id, x.Name, x.Slug, x.Images))
            .ToList();

    private static CatalogCategoryDto MapCategory(Category category) =>
        new(
            category.Id,
            category.Name,
            category.Slug,
            category.Description,
            category.IsActive,
            category.Images
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.CreatedAt)
                .Select(MapImage)
                .ToList());

    private static CategoryImageDto MapImage(CategoryImage image) =>
        new(
            image.Id,
            image.CategoryId,
            image.Url,
            image.FileName,
            image.ContentType,
            image.SizeBytes,
            image.AltText,
            image.SortOrder,
            image.StorageProvider);
}
