using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Amas.Api.Contracts;
using Amas.Api.Options;
using Amas.Application.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Amas.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    IIdentityService identity,
    IOptions<AuthOptions> authOptions,
    IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var authenticated = await identity.AuthenticateAsync(request.Email, request.Password, cancellationToken);
        if (authenticated.Succeeded)
        {
            return Ok(ApiResponse<LoginResponse>.Success(CreateToken(authenticated.Data!)));
        }

        var fallback = TryAuthenticateConfiguredAdmin(request);
        if (fallback is null)
        {
            return Unauthorized(ApiResponse<LoginResponse>.Failure("Invalid credentials."));
        }

        return Ok(ApiResponse<LoginResponse>.Success(CreateToken(fallback)));
    }

    private AuthenticatedUserDto? TryAuthenticateConfiguredAdmin(LoginRequest request)
    {
        var auth = authOptions.Value;
        if (string.IsNullOrWhiteSpace(auth.AdminEmail) || string.IsNullOrWhiteSpace(auth.AdminPassword))
        {
            return null;
        }

        if (!string.Equals(request.Email, auth.AdminEmail, StringComparison.OrdinalIgnoreCase) ||
            request.Password != auth.AdminPassword)
        {
            return null;
        }

        return new AuthenticatedUserDto(
            Guid.Empty,
            auth.AdminEmail,
            "Administrador AMAS",
            ["Admin"],
            ["admin.full_access"]);
    }

    private LoginResponse CreateToken(AuthenticatedUserDto user)
    {
        var jwt = jwtOptions.Value;
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(jwt.ExpirationMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id == Guid.Empty ? user.Email : user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("fullName", user.FullName)
        };

        claims.AddRange(user.Roles.Select(role => new Claim(ClaimTypes.Role, role)));
        claims.AddRange(user.Permissions.Select(permission => new Claim("permission", permission)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        return new LoginResponse(accessToken, expiresAt, user.Email, user.FullName, user.Roles, user.Permissions);
    }
}

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);
