using Amas.Domain.Core;

namespace Amas.Application.Abstractions;

public interface ICategoryImageRepository
{
    Task<bool> CategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryImage>> ListByCategoryAsync(Guid categoryId, CancellationToken cancellationToken);
    Task<int> GetNextSortOrderAsync(Guid categoryId, CancellationToken cancellationToken);
    Task AddRangeAsync(IEnumerable<CategoryImage> images, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
