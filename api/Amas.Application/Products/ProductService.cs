using Amas.Application.Abstractions;
using Amas.Application.Common;
using Amas.Domain.Core;
using FluentValidation;

namespace Amas.Application.Products;

public sealed class ProductService(
    IProductRepository products,
    ICacheService cache,
    IValidator<CreateProductRequest> createValidator,
    IValidator<UpdateProductRequest> updateValidator) : IProductService
{
    private static readonly TimeSpan ProductsTtl = TimeSpan.FromMinutes(10);

    public async Task<Result<IReadOnlyList<ProductDto>>> ListAsync(CancellationToken cancellationToken)
    {
        var cached = await cache.GetAsync<IReadOnlyList<ProductDto>>(CacheKeys.Products, cancellationToken);
        if (cached is not null)
        {
            return Result<IReadOnlyList<ProductDto>>.Success(cached);
        }

        var items = (await products.ListAsync(cancellationToken)).Select(Map).ToList();
        await cache.SetAsync(CacheKeys.Products, items, ProductsTtl, cancellationToken);

        return Result<IReadOnlyList<ProductDto>>.Success(items);
    }

    public async Task<Result<ProductDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await products.GetByIdAsync(id, cancellationToken);
        return product is null
            ? Result<ProductDto>.Failure("Product not found.")
            : Result<ProductDto>.Success(Map(product));
    }

    public async Task<Result<ProductDto>> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var validation = await createValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<ProductDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        if (request.CategoryId.HasValue && !await products.CategoryExistsAsync(request.CategoryId.Value, cancellationToken))
        {
            return Result<ProductDto>.Failure("Category not found.");
        }

        var product = new Product
        {
            Name = request.Name.Trim(),
            Slug = string.IsNullOrWhiteSpace(request.Slug) ? SlugHelper.From(request.Name) : SlugHelper.From(request.Slug),
            Description = request.Description?.Trim(),
            Sku = request.Sku?.Trim(),
            Price = request.Price,
            IsActive = request.IsActive,
            CategoryId = request.CategoryId
        };

        await products.AddAsync(product, cancellationToken);
        await products.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync(CacheKeys.Products, cancellationToken);

        return Result<ProductDto>.Success(Map(product));
    }

    public async Task<Result<ProductDto>> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<ProductDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var product = await products.GetByIdAsync(id, cancellationToken);
        if (product is null)
        {
            return Result<ProductDto>.Failure("Product not found.");
        }

        if (request.CategoryId.HasValue && !await products.CategoryExistsAsync(request.CategoryId.Value, cancellationToken))
        {
            return Result<ProductDto>.Failure("Category not found.");
        }

        product.Name = request.Name.Trim();
        product.Slug = string.IsNullOrWhiteSpace(request.Slug) ? SlugHelper.From(request.Name) : SlugHelper.From(request.Slug);
        product.Description = request.Description?.Trim();
        product.Sku = request.Sku?.Trim();
        product.Price = request.Price;
        product.IsActive = request.IsActive;
        product.CategoryId = request.CategoryId;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        await products.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync(CacheKeys.Products, cancellationToken);

        return Result<ProductDto>.Success(Map(product));
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var product = await products.GetByIdAsync(id, cancellationToken);
        if (product is null)
        {
            return Result.Failure("Product not found.");
        }

        products.Remove(product);
        await products.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync(CacheKeys.Products, cancellationToken);

        return Result.Success();
    }

    private static ProductDto Map(Product product) => new(
        product.Id,
        product.Name,
        product.Slug,
        product.Description,
        product.Sku,
        product.Price,
        product.IsActive,
        product.CategoryId,
        product.Category?.Name,
        product.Images.OrderBy(image => image.SortOrder).Select(image => image.Url).ToList());
}
