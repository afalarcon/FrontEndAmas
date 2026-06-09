using Amas.Domain.Common;

namespace Amas.Domain.Identity;

public sealed class Permission : AuditableEntity
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<RolePermission> RolePermissions { get; set; } = [];
}
