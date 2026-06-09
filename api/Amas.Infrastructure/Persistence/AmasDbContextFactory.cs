using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Amas.Infrastructure.Persistence;

public sealed class AmasDbContextFactory : IDesignTimeDbContextFactory<AmasDbContext>
{
    public AmasDbContext CreateDbContext(string[] args)
    {
        LoadDotEnv();

        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
            ?? "Host=localhost;Port=5432;Database=amas_core;Username=amas_user;Password=amas_password";

        var options = new DbContextOptionsBuilder<AmasDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AmasDbContext(options);
    }

    private static void LoadDotEnv()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", ".env")
        };

        var path = candidates.FirstOrDefault(File.Exists);
        if (path is null)
        {
            return;
        }

        foreach (var line in File.ReadAllLines(path))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#'))
            {
                continue;
            }

            var separatorIndex = trimmed.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = trimmed[..separatorIndex].Trim();
            var value = trimmed[(separatorIndex + 1)..].Trim().Trim('"');

            if (Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
