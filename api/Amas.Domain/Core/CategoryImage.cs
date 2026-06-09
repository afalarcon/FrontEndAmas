using Amas.Domain.Common;

namespace Amas.Domain.Core;

public sealed class CategoryImage : AuditableEntity
{
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = default!;
    public string Url { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string StorageProvider { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string? AltText { get; set; }
    public int SortOrder { get; set; }
}
