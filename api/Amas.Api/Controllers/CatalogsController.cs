using Amas.Api.Contracts;
using Amas.Application.Catalogs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amas.Api.Controllers;

[ApiController]
[Route("api/v1/catalogs")]
public sealed class CatalogsController(ICatalogService catalogs) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CatalogCategoryDto>>>> Get(CancellationToken cancellationToken)
    {
        var result = await catalogs.ListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CatalogCategoryDto>>.Success(result.Data!));
    }

    [HttpGet("images")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CatalogImagesGroupDto>>>> GetImages(CancellationToken cancellationToken)
    {
        var result = await catalogs.ListImagesAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CatalogImagesGroupDto>>.Success(result.Data!));
    }

    [HttpPost("cache/warmup")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CatalogWarmupDto>>> Warmup(CancellationToken cancellationToken)
    {
        var result = await catalogs.WarmupAsync(cancellationToken);
        return Ok(ApiResponse<CatalogWarmupDto>.Success(result.Data!));
    }
}
