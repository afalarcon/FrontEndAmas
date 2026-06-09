namespace Amas.Application.Configurations;

public sealed record ConfigurationDto(Guid Id, string Key, string Value, string? Description);

public sealed record UpsertConfigurationRequest(string Value, string? Description);
