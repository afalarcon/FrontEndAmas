using Amas.Application.Abstractions;
using Amas.Domain.Core;
using Microsoft.EntityFrameworkCore;

namespace Amas.Infrastructure.Persistence.Repositories;

public sealed class ConfigurationRepository(AmasDbContext dbContext) : IConfigurationRepository
{
    public async Task<IReadOnlyList<Configuration>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.Configurations
            .AsNoTracking()
            .OrderBy(x => x.Key)
            .ToListAsync(cancellationToken);

    public Task<Configuration?> GetByKeyAsync(string key, CancellationToken cancellationToken) =>
        dbContext.Configurations.FirstOrDefaultAsync(x => x.Key == key, cancellationToken);

    public Task AddAsync(Configuration configuration, CancellationToken cancellationToken) =>
        dbContext.Configurations.AddAsync(configuration, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
