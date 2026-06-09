using Amas.Application.Abstractions;
using Amas.Domain.Core;
using Microsoft.EntityFrameworkCore;

namespace Amas.Infrastructure.Persistence.Repositories;

public sealed class CategoryImageRepository(AmasDbContext dbContext) : ICategoryImageRepository
{
    public Task<bool> CategoryExistsAsync(Guid categoryId, CancellationToken cancellationToken) =>
        dbContext.Categories.AnyAsync(x => x.Id == categoryId, cancellationToken);

    public async Task<IReadOnlyList<CategoryImage>> ListByCategoryAsync(Guid categoryId, CancellationToken cancellationToken) =>
        await dbContext.CategoryImages
            .AsNoTracking()
            .Where(x => x.CategoryId == categoryId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task<int> GetNextSortOrderAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        var maxSortOrder = await dbContext.CategoryImages
            .Where(x => x.CategoryId == categoryId)
            .Select(x => (int?)x.SortOrder)
            .MaxAsync(cancellationToken);

        return maxSortOrder.GetValueOrDefault() + 1;
    }

    public Task AddRangeAsync(IEnumerable<CategoryImage> images, CancellationToken cancellationToken) =>
        dbContext.CategoryImages.AddRangeAsync(images, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
