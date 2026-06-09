using Amas.Api.Contracts;
using Amas.Application.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amas.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/identity")]
public sealed class IdentityController(IIdentityService identity) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<AdminUserDto>>>> Users(CancellationToken cancellationToken)
    {
        var result = await identity.ListUsersAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AdminUserDto>>.Success(result.Data!));
    }

    [HttpPost("users")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> CreateUser(CreateAdminUserRequest request, CancellationToken cancellationToken)
    {
        var result = await identity.CreateUserAsync(request, cancellationToken);
        return result.Succeeded
            ? Created($"/api/v1/identity/users/{result.Data!.Id}", ApiResponse<AdminUserDto>.Success(result.Data))
            : BadRequest(ApiResponse<AdminUserDto>.Failure(result.Error!));
    }

    [HttpPut("users/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> UpdateUser(Guid id, UpdateAdminUserRequest request, CancellationToken cancellationToken)
    {
        var result = await identity.UpdateUserAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return result.Error == "User not found."
                ? NotFound(ApiResponse<AdminUserDto>.Failure(result.Error))
                : BadRequest(ApiResponse<AdminUserDto>.Failure(result.Error!));
        }

        return Ok(ApiResponse<AdminUserDto>.Success(result.Data!));
    }

    [HttpGet("roles")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<RoleDto>>>> Roles(CancellationToken cancellationToken)
    {
        var result = await identity.ListRolesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<RoleDto>>.Success(result.Data!));
    }

    [HttpPost("roles")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> CreateRole(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var result = await identity.CreateRoleAsync(request, cancellationToken);
        return result.Succeeded
            ? Created($"/api/v1/identity/roles/{result.Data!.Id}", ApiResponse<RoleDto>.Success(result.Data))
            : BadRequest(ApiResponse<RoleDto>.Failure(result.Error!));
    }

    [HttpPut("roles/{id:guid}")]
    public async Task<ActionResult<ApiResponse<RoleDto>>> UpdateRole(Guid id, UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var result = await identity.UpdateRoleAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return result.Error == "Role not found."
                ? NotFound(ApiResponse<RoleDto>.Failure(result.Error))
                : BadRequest(ApiResponse<RoleDto>.Failure(result.Error!));
        }

        return Ok(ApiResponse<RoleDto>.Success(result.Data!));
    }

    [HttpGet("permissions")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<PermissionDto>>>> Permissions(CancellationToken cancellationToken)
    {
        var result = await identity.ListPermissionsAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PermissionDto>>.Success(result.Data!));
    }
}
