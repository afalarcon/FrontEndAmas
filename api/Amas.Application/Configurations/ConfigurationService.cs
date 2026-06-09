using Amas.Application.Abstractions;
using Amas.Application.Common;
using Amas.Domain.Core;
using FluentValidation;

namespace Amas.Application.Configurations;

public sealed class ConfigurationService(
    IConfigurationRepository configurations,
    ICacheService cache,
    IValidator<UpsertConfigurationRequest> validator) : IConfigurationService
{
    private static readonly TimeSpan ConfigurationsTtl = TimeSpan.FromHours(1);

    public async Task<Result<IReadOnlyList<ConfigurationDto>>> ListAsync(CancellationToken cancellationToken)
    {
        var cached = await cache.GetAsync<IReadOnlyList<ConfigurationDto>>(CacheKeys.Configurations, cancellationToken);
        if (cached is not null)
        {
            return Result<IReadOnlyList<ConfigurationDto>>.Success(cached);
        }

        var items = (await configurations.ListAsync(cancellationToken)).Select(Map).ToList();
        await cache.SetAsync(CacheKeys.Configurations, items, ConfigurationsTtl, cancellationToken);

        return Result<IReadOnlyList<ConfigurationDto>>.Success(items);
    }

    public async Task<Result<ConfigurationDto>> UpsertAsync(string key, UpsertConfigurationRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return Result<ConfigurationDto>.Failure("Configuration key is required.");
        }

        var validation = await validator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<ConfigurationDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var normalizedKey = key.Trim().ToLowerInvariant();
        var configuration = await configurations.GetByKeyAsync(normalizedKey, cancellationToken);
        if (configuration is null)
        {
            configuration = new Configuration
            {
                Key = normalizedKey,
                Value = request.Value,
                Description = request.Description?.Trim()
            };
            await configurations.AddAsync(configuration, cancellationToken);
        }
        else
        {
            configuration.Value = request.Value;
            configuration.Description = request.Description?.Trim();
            configuration.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await configurations.SaveChangesAsync(cancellationToken);
        await cache.RemoveAsync(CacheKeys.Configurations, cancellationToken);

        return Result<ConfigurationDto>.Success(Map(configuration));
    }

    private static ConfigurationDto Map(Configuration configuration) =>
        new(configuration.Id, configuration.Key, configuration.Value, configuration.Description);
}
