using StackExchange.Redis;

namespace Amas.Infrastructure.Redis;

public static class RedisConnectionStringBuilder
{
    public static string Build(RedisOptions options)
    {
        var configuration = ConfigurationOptions.Parse(options.Connection);
        if (!string.IsNullOrWhiteSpace(options.Password))
        {
            configuration.Password = options.Password;
        }

        return configuration.ToString();
    }
}
