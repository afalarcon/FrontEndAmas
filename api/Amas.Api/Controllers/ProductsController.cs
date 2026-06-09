using Amas.Api.Contracts;
using Amas.Application.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amas.Api.Controllers;

[ApiController]
[Route("api/v1/products")]
public sealed class ProductsController(IProductService products) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ProductDto>>>> Get(CancellationToken cancellationToken)
    {
        var result = await products.ListAsync(cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ProductDto>>.Success(result.Data!));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDto>>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await products.GetByIdAsync(id, cancellationToken);
        return result.Succeeded
            ? Ok(ApiResponse<ProductDto>.Success(result.Data!))
            : NotFound(ApiResponse<ProductDto>.Failure(result.Error!));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Create(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var result = await products.CreateAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(ApiResponse<ProductDto>.Failure(result.Error!));
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, ApiResponse<ProductDto>.Success(result.Data));
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<ProductDto>>> Update(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var result = await products.UpdateAsync(id, request, cancellationToken);
        if (!result.Succeeded)
        {
            return result.Error == "Product not found."
                ? NotFound(ApiResponse<ProductDto>.Failure(result.Error))
                : BadRequest(ApiResponse<ProductDto>.Failure(result.Error!));
        }

        return Ok(ApiResponse<ProductDto>.Success(result.Data!));
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await products.DeleteAsync(id, cancellationToken);
        return result.Succeeded
            ? Ok(ApiResponse.Success())
            : NotFound(ApiResponse.Failure(result.Error!));
    }
}
