using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class Category : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public List<Product> Products { get; set; } = [];
    public List<CategoryImage> Images { get; set; } = [];
}
