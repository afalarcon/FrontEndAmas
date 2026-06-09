using Amas.Application.Common;

namespace Amas.Application.Categories;

public interface ICategoryImageService
{
    Task<Result<IReadOnlyList<CategoryImageDto>>> ListAsync(Guid categoryId, CancellationToken cancellationToken);
    Task<Result<IReadOnlyList<CategoryImageDto>>> UploadAsync(
        Guid categoryId,
        IReadOnlyList<UploadCategoryImageFile> files,
        CancellationToken cancellationToken);
}
