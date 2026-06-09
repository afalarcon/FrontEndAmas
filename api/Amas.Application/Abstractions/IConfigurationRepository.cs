using Amas.Domain.Core;

namespace Amas.Application.Abstractions;

public interface IConfigurationRepository
{
    Task<IReadOnlyList<Configuration>> ListAsync(CancellationToken cancellationToken);
    Task<Configuration?> GetByKeyAsync(string key, CancellationToken cancellationToken);
    Task AddAsync(Configuration configuration, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
