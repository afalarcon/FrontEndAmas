using Amas.Domain.Common;

namespace Amas.Domain.Automation;

public sealed class AuditLog : AuditableEntity
{
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? DetailsJson { get; set; }
}
