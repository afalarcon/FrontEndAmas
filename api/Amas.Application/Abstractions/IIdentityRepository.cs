using Amas.Domain.Identity;

namespace Amas.Application.Abstractions;

public interface IIdentityRepository
{
    Task<IReadOnlyList<User>> ListUsersAsync(CancellationToken cancellationToken);
    Task<User?> GetUserByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<User?> GetUserByEmailAsync(string email, CancellationToken cancellationToken);
    Task<IReadOnlyList<Role>> ListRolesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<Role>> GetRolesByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);
    Task<Role?> GetRoleByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Role?> GetRoleByNameAsync(string name, CancellationToken cancellationToken);
    Task<IReadOnlyList<Permission>> ListPermissionsAsync(CancellationToken cancellationToken);
    Task AddUserAsync(User user, CancellationToken cancellationToken);
    Task AddRoleAsync(Role role, CancellationToken cancellationToken);
    void RemoveUserRoles(User user);
    void RemoveRolePermissions(Role role);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
