namespace Amas.Application.Categories;

public sealed record CategoryDto(Guid Id, string Name, string Slug, string? Description, bool IsActive);

public sealed record CreateCategoryRequest(string Name, string? Slug, string? Description, bool IsActive);

public sealed record UpdateCategoryRequest(string Name, string? Slug, string? Description, bool IsActive);
