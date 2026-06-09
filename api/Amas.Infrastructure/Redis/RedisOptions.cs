namespace Amas.Infrastructure.Redis;

public sealed class RedisOptions
{
    public string Connection { get; set; } = "localhost:6379";
    public string? Password { get; set; }
}
