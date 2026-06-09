using Amas.Domain.Common;

namespace Amas.Domain.Automation;

public sealed class WorkflowEvent : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
}
