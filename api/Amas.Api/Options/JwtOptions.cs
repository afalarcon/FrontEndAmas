namespace Amas.Api.Options;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "amas-api";
    public string Audience { get; set; } = "amas-client";
    public string Secret { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; } = 60;
}
