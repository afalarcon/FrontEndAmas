namespace Amas.Application.Identity;

public sealed record AdminUserDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsActive,
    IReadOnlyList<RoleSummaryDto> Roles);

public sealed record RoleDto(
    Guid Id,
    string Name,
    string Description,
    IReadOnlyList<PermissionDto> Permissions);

public sealed record RoleSummaryDto(Guid Id, string Name);

public sealed record PermissionDto(Guid Id, string Code, string Description);

public sealed record CreateAdminUserRequest(
    string Email,
    string FullName,
    string Password,
    bool IsActive,
    IReadOnlyList<Guid> RoleIds);

public sealed record UpdateAdminUserRequest(
    string Email,
    string FullName,
    string? Password,
    bool IsActive,
    IReadOnlyList<Guid> RoleIds);

public sealed record CreateRoleRequest(
    string Name,
    string Description,
    IReadOnlyList<Guid> PermissionIds);

public sealed record UpdateRoleRequest(
    string Name,
    string Description,
    IReadOnlyList<Guid> PermissionIds);

public sealed record AuthenticatedUserDto(
    Guid Id,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);
