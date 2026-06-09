using Amas.Application.Abstractions;
using Amas.Application.Common;
using Amas.Domain.Core;
using FluentValidation;

namespace Amas.Application.Categories;

public sealed class CategoryService(
    ICategoryRepository categories,
    ICacheService cache,
    IValidator<CreateCategoryRequest> createValidator,
    IValidator<UpdateCategoryRequest> updateValidator) : ICategoryService
{
    private static readonly TimeSpan CategoriesTtl = TimeSpan.FromMinutes(30);

    public async Task<Result<IReadOnlyList<CategoryDto>>> ListAsync(CancellationToken cancellationToken)
    {
        var cached = await cache.GetAsync<IReadOnlyList<CategoryDto>>(CacheKeys.Categories, cancellationToken);
        if (cached is not null)
        {
            return Result<IReadOnlyList<CategoryDto>>.Success(cached);
        }

        var items = (await categories.ListAsync(cancellationToken)).Select(Map).ToList();
        await cache.SetAsync(CacheKeys.Categories, items, CategoriesTtl, cancellationToken);

        return Result<IReadOnlyList<CategoryDto>>.Success(items);
    }

    public async Task<Result<CategoryDto>> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<CategoryDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var category = new Category
        {
            Name = request.Name.Trim(),
            Slug = string.IsNullOrWhiteSpace(request.Slug) ? SlugHelper.From(request.Name) : SlugHelper.From(request.Slug),
            Description = request.Description?.Trim(),
            IsActive = request.IsActive
        };

        await categories.AddAsync(category, cancellationToken);
        await categories.SaveChangesAsync(cancellationToken);
        await InvalidateCategoryCaches(cancellationToken);

        return Result<CategoryDto>.Success(Map(category));
    }

    public async Task<Result<CategoryDto>> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<CategoryDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var category = await categories.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result<CategoryDto>.Failure("Category not found.");
        }

        category.Name = request.Name.Trim();
        category.Slug = string.IsNullOrWhiteSpace(request.Slug) ? SlugHelper.From(request.Name) : SlugHelper.From(request.Slug);
        category.Description = request.Description?.Trim();
        category.IsActive = request.IsActive;

        await categories.SaveChangesAsync(cancellationToken);
        await InvalidateCategoryCaches(cancellationToken);

        return Result<CategoryDto>.Success(Map(category));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await categories.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result.Failure("Category not found.");
        }

        categories.Remove(category);
        await categories.SaveChangesAsync(cancellationToken);
        await InvalidateCategoryCaches(cancellationToken);

        return Result.Success();
    }

    private async Task InvalidateCategoryCaches(CancellationToken cancellationToken)
    {
        await cache.RemoveAsync(CacheKeys.Categories, cancellationToken);
        await cache.RemoveAsync(CacheKeys.Catalogs, cancellationToken);
        await cache.RemoveAsync(CacheKeys.CatalogImages, cancellationToken);
    }

    private static CategoryDto Map(Category category) =>
        new(category.Id, category.Name, category.Slug, category.Description, category.IsActive);
}
