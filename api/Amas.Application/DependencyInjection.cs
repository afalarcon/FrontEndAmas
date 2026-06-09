using Amas.Application.Categories;
using Amas.Application.Catalogs;
using Amas.Application.Configurations;
using Amas.Application.Identity;
using Amas.Application.Products;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Amas.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ICategoryImageService, CategoryImageService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<IConfigurationService, ConfigurationService>();
        services.AddScoped<IIdentityService, IdentityService>();

        return services;
    }
}
