namespace Amas.Infrastructure.Storage;

public sealed class MediaStorageOptions
{
    public string Provider { get; set; } = "Local";
    public string LocalPath { get; set; } = "storage/media";
    public string PublicBaseUrl { get; set; } = "/media";
    public long MaxFileBytes { get; set; } = 5 * 1024 * 1024;
    public string[] AllowedContentTypes { get; set; } =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];
}
