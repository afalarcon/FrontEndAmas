using Amas.Application.Common;

namespace Amas.Application.Categories;

public interface ICategoryService
{
    Task<Result<IReadOnlyList<CategoryDto>>> ListAsync(CancellationToken cancellationToken);
    Task<Result<CategoryDto>> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<Result<CategoryDto>> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
