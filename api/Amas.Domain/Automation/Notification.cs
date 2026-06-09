using Amas.Domain.Common;

namespace Amas.Domain.Automation;

public sealed class Notification : AuditableEntity
{
    public string Channel { get; set; } = string.Empty;
    public string Recipient { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset? SentAt { get; set; }
}
