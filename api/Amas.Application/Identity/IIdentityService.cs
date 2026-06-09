using Amas.Application.Common;

namespace Amas.Application.Identity;

public interface IIdentityService
{
    Task<Result<IReadOnlyList<AdminUserDto>>> ListUsersAsync(CancellationToken cancellationToken);
    Task<Result<AdminUserDto>> CreateUserAsync(CreateAdminUserRequest request, CancellationToken cancellationToken);
    Task<Result<AdminUserDto>> UpdateUserAsync(Guid id, UpdateAdminUserRequest request, CancellationToken cancellationToken);
    Task<Result<IReadOnlyList<RoleDto>>> ListRolesAsync(CancellationToken cancellationToken);
    Task<Result<RoleDto>> CreateRoleAsync(CreateRoleRequest request, CancellationToken cancellationToken);
    Task<Result<RoleDto>> UpdateRoleAsync(Guid id, UpdateRoleRequest request, CancellationToken cancellationToken);
    Task<Result<IReadOnlyList<PermissionDto>>> ListPermissionsAsync(CancellationToken cancellationToken);
    Task<Result<AuthenticatedUserDto>> AuthenticateAsync(string email, string password, CancellationToken cancellationToken);
}
