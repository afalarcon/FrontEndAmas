using Amas.Api.Contracts;
using Amas.Application.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Amas.Api.Controllers;

[ApiController]
[Route("api/v1/categories/{categoryId:guid}/images")]
public sealed class CategoryImagesController(ICategoryImageService categoryImages) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryImageDto>>>> Get(
        Guid categoryId,
        CancellationToken cancellationToken)
    {
        var result = await categoryImages.ListAsync(categoryId, cancellationToken);
        return result.Succeeded
            ? Ok(ApiResponse<IReadOnlyList<CategoryImageDto>>.Success(result.Data!))
            : NotFound(ApiResponse<IReadOnlyList<CategoryImageDto>>.Failure(result.Error!));
    }

    [HttpPost]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(100 * 1024 * 1024)]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<CategoryImageDto>>>> Upload(
        Guid categoryId,
        [FromForm] UploadCategoryImagesForm request,
        CancellationToken cancellationToken)
    {
        if (request.Files.Count == 0)
        {
            return BadRequest(ApiResponse<IReadOnlyList<CategoryImageDto>>.Failure("At least one image is required."));
        }

        var streams = new List<Stream>(request.Files.Count);
        try
        {
            var files = request.Files.Select(file =>
            {
                var stream = file.OpenReadStream();
                streams.Add(stream);
                return new UploadCategoryImageFile(
                    file.FileName,
                    file.ContentType,
                    file.Length,
                    stream,
                    request.AltText);
            }).ToList();

            var result = await categoryImages.UploadAsync(categoryId, files, cancellationToken);
            if (!result.Succeeded)
            {
                return result.Error == "Category not found."
                    ? NotFound(ApiResponse<IReadOnlyList<CategoryImageDto>>.Failure(result.Error))
                    : BadRequest(ApiResponse<IReadOnlyList<CategoryImageDto>>.Failure(result.Error!));
            }

            return Created(
                $"/api/v1/categories/{categoryId}/images",
                ApiResponse<IReadOnlyList<CategoryImageDto>>.Success(result.Data!));
        }
        finally
        {
            foreach (var stream in streams)
            {
                await stream.DisposeAsync();
            }
        }
    }
}

public sealed class UploadCategoryImagesForm
{
    public List<IFormFile> Files { get; init; } = [];
    public string? AltText { get; init; }
}
