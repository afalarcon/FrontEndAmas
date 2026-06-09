using Amas.Api.Contracts;
using Amas.Application.Configurations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amas.Api.Controllers;

[ApiController]
[Route("api/v1/configurations")]
public sealed class ConfigurationsController(IConfigurationService configurations) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ConfigurationDto>>>> Get(CancellationToken cancellationToken)
    {
        var result = await configurations.ListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ConfigurationDto>>.Success(result.Data!));
    }

    [HttpPut("{key}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ConfigurationDto>>> Upsert(
        string key,
        UpsertConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await configurations.UpsertAsync(key, request, cancellationToken);
        return result.Succeeded
            ? Ok(ApiResponse<ConfigurationDto>.Success(result.Data!))
            : BadRequest(ApiResponse<ConfigurationDto>.Failure(result.Error!));
    }
}
