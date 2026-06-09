using Amas.Application.Common;

namespace Amas.Application.Catalogs;

public interface ICatalogService
{
    Task<Result<IReadOnlyList<CatalogCategoryDto>>> ListAsync(CancellationToken cancellationToken);
    Task<Result<IReadOnlyList<CatalogImagesGroupDto>>> ListImagesAsync(CancellationToken cancellationToken);
    Task<Result<CatalogWarmupDto>> WarmupAsync(CancellationToken cancellationToken);
}
