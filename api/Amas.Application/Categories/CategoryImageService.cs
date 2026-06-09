using Amas.Application.Abstractions;
using Amas.Application.Common;
using Amas.Domain.Core;

namespace Amas.Application.Categories;

public sealed class CategoryImageService(
    ICategoryImageRepository categoryImages,
    IImageStorage imageStorage,
    ICacheService cache) : ICategoryImageService
{
    private static readonly TimeSpan CategoryImagesTtl = TimeSpan.FromMinutes(30);

    public async Task<Result<IReadOnlyList<CategoryImageDto>>> ListAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        if (!await categoryImages.CategoryExistsAsync(categoryId, cancellationToken))
        {
            return Result<IReadOnlyList<CategoryImageDto>>.Failure("Category not found.");
        }

        var cacheKey = CacheKeys.CategoryImages(categoryId);
        var cached = await cache.GetAsync<IReadOnlyList<CategoryImageDto>>(cacheKey, cancellationToken);
        if (cached is not null)
        {
            return Result<IReadOnlyList<CategoryImageDto>>.Success(cached);
        }

        var items = (await categoryImages.ListByCategoryAsync(categoryId, cancellationToken)).Select(Map).ToList();
        await cache.SetAsync(cacheKey, items, CategoryImagesTtl, cancellationToken);

        return Result<IReadOnlyList<CategoryImageDto>>.Success(items);
    }

    public async Task<Result<IReadOnlyList<CategoryImageDto>>> UploadAsync(
        Guid categoryId,
        IReadOnlyList<UploadCategoryImageFile> files,
        CancellationToken cancellationToken)
    {
        if (files.Count == 0)
        {
            return Result<IReadOnlyList<CategoryImageDto>>.Failure("At least one image is required.");
        }

        if (!await categoryImages.CategoryExistsAsync(categoryId, cancellationToken))
        {
            return Result<IReadOnlyList<CategoryImageDto>>.Failure("Category not found.");
        }

        var nextSortOrder = await categoryImages.GetNextSortOrderAsync(categoryId, cancellationToken);
        var images = new List<CategoryImage>(files.Count);

        foreach (var file in files)
        {
            if (file.SizeBytes <= 0)
            {
                return Result<IReadOnlyList<CategoryImageDto>>.Failure($"Image '{file.FileName}' is empty.");
            }

            StoredImageFile stored;
            try
            {
                stored = await imageStorage.SaveAsync(
                    new ImageStorageRequest(
                        $"categories/{categoryId:N}",
                        file.FileName,
                        file.ContentType,
                        file.SizeBytes,
                        file.Content),
                    cancellationToken);
            }
            catch (InvalidOperationException ex)
            {
                return Result<IReadOnlyList<CategoryImageDto>>.Failure(ex.Message);
            }

            images.Add(new CategoryImage
            {
                CategoryId = categoryId,
                Url = stored.Url,
                StoragePath = stored.StoragePath,
                StorageProvider = stored.StorageProvider,
                FileName = stored.FileName,
                ContentType = stored.ContentType,
                SizeBytes = stored.SizeBytes,
                AltText = string.IsNullOrWhiteSpace(file.AltText) ? null : file.AltText.Trim(),
                SortOrder = nextSortOrder++
            });
        }

        await categoryImages.AddRangeAsync(images, cancellationToken);
        await categoryImages.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync(CacheKeys.CategoryImages(categoryId), cancellationToken);
        await cache.RemoveAsync(CacheKeys.Catalogs, cancellationToken);
        await cache.RemoveAsync(CacheKeys.CatalogImages, cancellationToken);

        return Result<IReadOnlyList<CategoryImageDto>>.Success(images.Select(Map).ToList());
    }

    private static CategoryImageDto Map(CategoryImage image) =>
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
