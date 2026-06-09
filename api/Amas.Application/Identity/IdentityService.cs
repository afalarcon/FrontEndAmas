using Amas.Application.Abstractions;
using Amas.Application.Common;
using Amas.Domain.Identity;
using FluentValidation;

namespace Amas.Application.Identity;

public sealed class IdentityService(
    IIdentityRepository identity,
    IValidator<CreateAdminUserRequest> createUserValidator,
    IValidator<UpdateAdminUserRequest> updateUserValidator,
    IValidator<CreateRoleRequest> createRoleValidator,
    IValidator<UpdateRoleRequest> updateRoleValidator) : IIdentityService
{
    public async Task<Result<IReadOnlyList<AdminUserDto>>> ListUsersAsync(CancellationToken cancellationToken)
    {
        var users = await identity.ListUsersAsync(cancellationToken);
        return Result<IReadOnlyList<AdminUserDto>>.Success(users.Select(MapUser).ToList());
    }

    public async Task<Result<AdminUserDto>> CreateUserAsync(CreateAdminUserRequest request, CancellationToken cancellationToken)
    {
        var validation = await createUserValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<AdminUserDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var email = request.Email.Trim().ToLowerInvariant();
        if (await identity.GetUserByEmailAsync(email, cancellationToken) is not null)
        {
            return Result<AdminUserDto>.Failure("User email already exists.");
        }

        var roles = await LoadRoles(request.RoleIds, cancellationToken);
        if (roles.Count != request.RoleIds.Distinct().Count())
        {
            return Result<AdminUserDto>.Failure("One or more roles do not exist.");
        }

        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            IsActive = request.IsActive
        };

        user.UserRoles = roles.Select(role => new UserRole { User = user, Role = role }).ToList();

        await identity.AddUserAsync(user, cancellationToken);
        await identity.SaveChangesAsync(cancellationToken);

        return Result<AdminUserDto>.Success(MapUser(user));
    }

    public async Task<Result<AdminUserDto>> UpdateUserAsync(Guid id, UpdateAdminUserRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateUserValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<AdminUserDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var user = await identity.GetUserByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return Result<AdminUserDto>.Failure("User not found.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var existing = await identity.GetUserByEmailAsync(email, cancellationToken);
        if (existing is not null && existing.Id != id)
        {
            return Result<AdminUserDto>.Failure("User email already exists.");
        }

        var roles = await LoadRoles(request.RoleIds, cancellationToken);
        if (roles.Count != request.RoleIds.Distinct().Count())
        {
            return Result<AdminUserDto>.Failure("One or more roles do not exist.");
        }

        user.Email = email;
        user.FullName = request.FullName.Trim();
        user.IsActive = request.IsActive;
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = PasswordHasher.Hash(request.Password);
        }

        identity.RemoveUserRoles(user);
        user.UserRoles = roles.Select(role => new UserRole { UserId = user.Id, RoleId = role.Id }).ToList();

        await identity.SaveChangesAsync(cancellationToken);
        user.UserRoles = roles.Select(role => new UserRole { UserId = user.Id, RoleId = role.Id, Role = role }).ToList();

        return Result<AdminUserDto>.Success(MapUser(user));
    }

    public async Task<Result<IReadOnlyList<RoleDto>>> ListRolesAsync(CancellationToken cancellationToken)
    {
        var roles = await identity.ListRolesAsync(cancellationToken);
        return Result<IReadOnlyList<RoleDto>>.Success(roles.Select(MapRole).ToList());
    }

    public async Task<Result<RoleDto>> CreateRoleAsync(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var validation = await createRoleValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<RoleDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var name = request.Name.Trim();
        if (await identity.GetRoleByNameAsync(name, cancellationToken) is not null)
        {
            return Result<RoleDto>.Failure("Role name already exists.");
        }

        var permissions = await LoadPermissions(request.PermissionIds, cancellationToken);
        if (permissions.Count != request.PermissionIds.Distinct().Count())
        {
            return Result<RoleDto>.Failure("One or more permissions do not exist.");
        }

        var role = new Role
        {
            Name = name,
            Description = request.Description.Trim()
        };

        role.RolePermissions = permissions.Select(permission => new RolePermission { Role = role, Permission = permission }).ToList();

        await identity.AddRoleAsync(role, cancellationToken);
        await identity.SaveChangesAsync(cancellationToken);

        return Result<RoleDto>.Success(MapRole(role));
    }

    public async Task<Result<RoleDto>> UpdateRoleAsync(Guid id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var validation = await updateRoleValidator.ValidateAsync(request, cancellationToken);
        if (!validation.IsValid)
        {
            return Result<RoleDto>.Failure(validation.Errors[0].ErrorMessage);
        }

        var role = await identity.GetRoleByIdAsync(id, cancellationToken);
        if (role is null)
        {
            return Result<RoleDto>.Failure("Role not found.");
        }

        var name = request.Name.Trim();
        var existing = await identity.GetRoleByNameAsync(name, cancellationToken);
        if (existing is not null && existing.Id != id)
        {
            return Result<RoleDto>.Failure("Role name already exists.");
        }

        var permissions = await LoadPermissions(request.PermissionIds, cancellationToken);
        if (permissions.Count != request.PermissionIds.Distinct().Count())
        {
            return Result<RoleDto>.Failure("One or more permissions do not exist.");
        }

        role.Name = name;
        role.Description = request.Description.Trim();
        identity.RemoveRolePermissions(role);
        role.RolePermissions = permissions
            .Select(permission => new RolePermission { RoleId = role.Id, PermissionId = permission.Id })
            .ToList();

        await identity.SaveChangesAsync(cancellationToken);
        role.RolePermissions = permissions
            .Select(permission => new RolePermission { RoleId = role.Id, PermissionId = permission.Id, Permission = permission })
            .ToList();

        return Result<RoleDto>.Success(MapRole(role));
    }

    public async Task<Result<IReadOnlyList<PermissionDto>>> ListPermissionsAsync(CancellationToken cancellationToken)
    {
        var permissions = await identity.ListPermissionsAsync(cancellationToken);
        return Result<IReadOnlyList<PermissionDto>>.Success(permissions.Select(MapPermission).ToList());
    }

    public async Task<Result<AuthenticatedUserDto>> AuthenticateAsync(string email, string password, CancellationToken cancellationToken)
    {
        var user = await identity.GetUserByEmailAsync(email.Trim().ToLowerInvariant(), cancellationToken);
        if (user is null || !user.IsActive || !PasswordHasher.Verify(password, user.PasswordHash))
        {
            return Result<AuthenticatedUserDto>.Failure("Invalid credentials.");
        }

        var roles = user.UserRoles.Select(x => x.Role.Name).Order().ToList();
        var permissions = user.UserRoles
            .SelectMany(x => x.Role.RolePermissions)
            .Select(x => x.Permission.Code)
            .Distinct()
            .Order()
            .ToList();

        return Result<AuthenticatedUserDto>.Success(new AuthenticatedUserDto(user.Id, user.Email, user.FullName, roles, permissions));
    }

    private async Task<IReadOnlyList<Role>> LoadRoles(IReadOnlyCollection<Guid> roleIds, CancellationToken cancellationToken) =>
        roleIds.Count == 0 ? [] : await identity.GetRolesByIdsAsync(roleIds.Distinct().ToList(), cancellationToken);

    private async Task<IReadOnlyList<Permission>> LoadPermissions(IReadOnlyCollection<Guid> permissionIds, CancellationToken cancellationToken)
    {
        if (permissionIds.Count == 0)
        {
            return [];
        }

        var allPermissions = await identity.ListPermissionsAsync(cancellationToken);
        var selectedIds = permissionIds.Distinct().ToHashSet();
        return allPermissions.Where(permission => selectedIds.Contains(permission.Id)).ToList();
    }

    private static AdminUserDto MapUser(User user) =>
        new(
            user.Id,
            user.Email,
            user.FullName,
            user.IsActive,
            user.UserRoles.Select(x => new RoleSummaryDto(x.Role.Id, x.Role.Name)).OrderBy(x => x.Name).ToList());

    private static RoleDto MapRole(Role role) =>
        new(
            role.Id,
            role.Name,
            role.Description,
            role.RolePermissions.Select(x => MapPermission(x.Permission)).OrderBy(x => x.Code).ToList());

    private static PermissionDto MapPermission(Permission permission) =>
        new(permission.Id, permission.Code, permission.Description);
}
