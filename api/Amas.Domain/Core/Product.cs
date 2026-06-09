using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class Product : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Sku { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public List<ProductImage> Images { get; set; } = [];
}
