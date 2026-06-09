FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Amas.slnx ./
COPY Amas.Api/Amas.Api.csproj Amas.Api/
COPY Amas.Application/Amas.Application.csproj Amas.Application/
COPY Amas.Domain/Amas.Domain.csproj Amas.Domain/
COPY Amas.Infrastructure/Amas.Infrastructure.csproj Amas.Infrastructure/

RUN dotnet restore Amas.slnx

COPY . .
RUN dotnet publish Amas.Api/Amas.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Amas.Api.dll"]
