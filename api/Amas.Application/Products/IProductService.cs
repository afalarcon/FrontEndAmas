using Amas.Application.Common;

namespace Amas.Application.Products;

public interface IProductService
{
    Task<Result<IReadOnlyList<ProductDto>>> ListAsync(CancellationToken cancellationToken);
    Task<Result<ProductDto>> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Result<ProductDto>> CreateAsync(CreateProductRequest request, CancellationToken cancellationToken);
    Task<Result<ProductDto>> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken cancellationToken);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
