namespace Amas.Application.Common;

public static class CacheKeys
{
    public const string Products = "amas:products:list";
    public const string Categories = "amas:categories:list";
    public const string Configurations = "amas:configurations:list";
    public const string Catalogs = "amas:catalogs:list";
    public const string CatalogImages = "amas:catalogs:images";

    public static string CategoryImages(Guid categoryId) => $"amas:categories:{categoryId:N}:images";
}
