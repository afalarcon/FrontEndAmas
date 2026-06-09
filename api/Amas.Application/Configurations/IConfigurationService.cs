using Amas.Application.Common;

namespace Amas.Application.Configurations;

public interface IConfigurationService
{
    Task<Result<IReadOnlyList<ConfigurationDto>>> ListAsync(CancellationToken cancellationToken);
    Task<Result<ConfigurationDto>> UpsertAsync(string key, UpsertConfigurationRequest request, CancellationToken cancellationToken);
}
