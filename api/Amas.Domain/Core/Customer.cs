using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class Customer : AuditableEntity
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
