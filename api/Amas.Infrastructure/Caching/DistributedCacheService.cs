using System.Text.Json;
using Amas.Application.Abstractions;
using Microsoft.Extensions.Caching.Distributed;

namespace Amas.Infrastructure.Caching;

public sealed class DistributedCacheService(IDistributedCache cache) : ICacheService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan CacheTimeout = TimeSpan.FromSeconds(2);

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            using var timeout = CreateTimeout(cancellationToken);
            var value = await cache.GetStringAsync(key, timeout.Token);
            return value is null ? default : JsonSerializer.Deserialize<T>(value, JsonOptions);
        }
        catch
        {
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        try
        {
            using var timeout = CreateTimeout(cancellationToken);
            var json = JsonSerializer.Serialize(value, JsonOptions);
            await cache.SetStringAsync(
                key,
                json,
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
                timeout.Token);
        }
        catch
        {
            // Cache is an optimization; API writes must not fail because Redis is unavailable.
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            using var timeout = CreateTimeout(cancellationToken);
            await cache.RemoveAsync(key, timeout.Token);
        }
        catch
        {
            // Cache is an optimization; API writes must not hang because Redis is unavailable.
        }
    }

    private static CancellationTokenSource CreateTimeout(CancellationToken cancellationToken)
    {
        var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(CacheTimeout);
        return timeout;
    }
}
