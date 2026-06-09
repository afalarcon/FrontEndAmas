using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class Configuration : AuditableEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}
