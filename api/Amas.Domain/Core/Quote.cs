using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class Quote : AuditableEntity
{
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string Status { get; set; } = "Draft";
    public decimal Total { get; set; }
}
