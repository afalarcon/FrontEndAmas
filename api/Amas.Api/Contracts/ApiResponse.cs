namespace Amas.Api.Contracts;

public sealed record ApiResponse<T>(bool Succeeded, T? Data, string? Error)
{
    public static ApiResponse<T> Success(T data) => new(true, data, null);
    public static ApiResponse<T> Failure(string error) => new(false, default, error);
}

public sealed record ApiResponse(bool Succeeded, string? Error)
{
    public static ApiResponse Success() => new(true, null);
    public static ApiResponse Failure(string error) => new(false, error);
}
