using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class Order : AuditableEntity
{
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public string Status { get; set; } = "Pending";
    public decimal Total { get; set; }
}
