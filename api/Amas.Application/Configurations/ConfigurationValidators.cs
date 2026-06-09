using FluentValidation;

namespace Amas.Application.Configurations;

public sealed class UpsertConfigurationRequestValidator : AbstractValidator<UpsertConfigurationRequest>
{
    public UpsertConfigurationRequestValidator()
    {
        RuleFor(x => x.Value).NotNull().MaximumLength(4000);
        RuleFor(x => x.Description).MaximumLength(1000);
    }
}
