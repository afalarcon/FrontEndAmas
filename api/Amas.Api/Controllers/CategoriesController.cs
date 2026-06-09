using Amas.Api.Contracts;
using Amas.Application.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amas.Api.Controllers;

[ApiController]
[Route("api/v1/categories")]
public sealed class CategoriesController(ICategoryService categories) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryDto>>>> Get(CancellationToken cancellationToken)
    {
        var result = await categories.ListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Success(result.Data!));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Create(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await categories.CreateAsync(request, cancellationToken);
        return result.Succeeded
            ? Created($"/api/v1/categories/{result.Data!.Id}", ApiResponse<CategoryDto>.Success(result.Data))
            : BadRequest(ApiResponse<CategoryDto>.Failure(result.Error!));
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CategoryDto>>> Update(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await categories.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return result.Error == "Category not found."
                ? NotFound(ApiResponse<CategoryDto>.Failure(result.Error))
                : BadRequest(ApiResponse<CategoryDto>.Failure(result.Error!));
        }

        return Ok(ApiResponse<CategoryDto>.Success(result.Data!));
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await categories.DeleteAsync(id, cancellationToken);
        return result.Succeeded
            ? Ok(ApiResponse.Success())
            : NotFound(ApiResponse.Failure(result.Error!));
    }
}
