namespace Amas.Application.Common;

public sealed record Result<T>(bool Succeeded, T? Data, string? Error)
{
    public static Result<T> Success(T data) => new(true, data, null);
    public static Result<T> Failure(string error) => new(false, default, error);
}

public sealed record Result(bool Succeeded, string? Error)
{
    public static Result Success() => new(true, null);
    public static Result Failure(string error) => new(false, error);
}
