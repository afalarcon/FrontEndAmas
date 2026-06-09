# AMAS API

API ASP.NET Core en .NET 10 para AMAS, organizada con Clean Architecture:

- `Amas.Api`: controllers, Swagger, JWT, health checks.
- `Amas.Application`: DTOs, validadores, servicios y contratos.
- `Amas.Domain`: entidades de Identity, Core y Automation.
- `Amas.Infrastructure`: EF Core, PostgreSQL, repositorios y Redis cache.

## Endpoints iniciales

- `GET /health`
- `GET /api/v1/products`
- `GET /api/v1/products/{id}`
- `POST /api/v1/products`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`
- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `PUT /api/v1/categories/{id}`
- `DELETE /api/v1/categories/{id}`
- `GET /api/v1/categories/{id}/images`
- `POST /api/v1/categories/{id}/images`
- `GET /api/v1/catalogs`
- `GET /api/v1/catalogs/images`
- `POST /api/v1/catalogs/cache/warmup`
- `GET /api/v1/configurations`
- `PUT /api/v1/configurations/{key}`

## Cache Redis

La API consulta Redis antes de PostgreSQL en:

- Products: TTL 10 minutos.
- Categories: TTL 30 minutos.
- Category images: TTL 30 minutos por categoria.
- Catalogs: TTL 30 minutos, categorias activas con imagenes.
- Catalog images: TTL 30 minutos, imagenes agrupadas por categoria.
- Configurations: TTL 1 hora.

En escrituras se invalida la clave de lista correspondiente.

## Imagenes de categorias

La carga inicial usa storage local configurable y guarda metadata en PostgreSQL. Redis solo cachea la lectura que consume el front.

- `POST /api/v1/categories/{id}/images`: protegido con JWT, `multipart/form-data`.
- Campo para archivos: `files`.
- Campo opcional: `altText`.
- `GET /api/v1/categories/{id}/images`: publico, devuelve las URLs ordenadas desde cache/DB.

Ejemplo Angular:

```ts
const form = new FormData();
for (const file of files) {
  form.append('files', file);
}
form.append('altText', 'Imagen de categoria');

await http.post(`/api/v1/categories/${categoryId}/images`, form).toPromise();
```

Configuracion de storage:

```env
MediaStorage__Provider=Local
MediaStorage__LocalPath=storage/media
MediaStorage__PublicBaseUrl=/media
MediaStorage__MaxFileBytes=5242880
MediaStorage__AllowedContentTypes__0=image/jpeg
MediaStorage__AllowedContentTypes__1=image/png
MediaStorage__AllowedContentTypes__2=image/webp
```

Con esta configuracion los archivos se guardan en `api/storage/media/categories/{categoryId}/...` y la API los sirve desde `/media/categories/{categoryId}/...`. Para moverlo luego a S3, Azure Blob u otro storage, se cambia la implementacion de `IImageStorage` y se conserva el contrato HTTP.

## Catalogos cacheados para frontend

Para pantallas publicas, el front debe preferir los endpoints agregados:

- `GET /api/v1/catalogs`: trae categorias activas con sus imagenes en una sola respuesta.
- `GET /api/v1/catalogs/images`: trae todas las imagenes agrupadas por categoria.

Ambos endpoints consultan Redis primero. Si no hay cache, consultan PostgreSQL una vez, guardan el resultado con TTL y responden. Para precargar Redis despues de deploy, migraciones o carga masiva:

```http
POST /api/v1/catalogs/cache/warmup
Authorization: Bearer <token>
```

Las escrituras de categorias y la carga de imagenes invalidan `amas:catalogs:list` y `amas:catalogs:images`, de forma que el siguiente warmup o lectura reconstruye el cache con informacion vigente.

## Configuracion local

Copiar variables:

```bash
cp .env.example .env
```

Para desarrollo por Tailscale, usar el host Tailscale del VPS en `ConnectionStrings__Postgres` y `Redis__Connection`.
La API carga automaticamente `api/.env` al ejecutar con `dotnet run`.

Ejecutar con .NET:

```bash
dotnet restore Amas.slnx
dotnet ef database update --project Amas.Infrastructure --startup-project Amas.Api
dotnet run --project Amas.Api --no-launch-profile
```

Swagger queda en:

```text
http://localhost:8080/swagger
```

## Docker en VPS

La API escucha internamente en `8080` y se conecta a las redes externas `amas_net` y `traefik_proxy`.

```bash
cp .env.example .env
docker compose up -d --build
```

Ejecutar migraciones desde el host o desde un contenedor SDK apuntando a la misma red. Ejemplo local:

```bash
dotnet ef database update --project Amas.Infrastructure --startup-project Amas.Api
```

## Variables requeridas

```env
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
ConnectionStrings__Postgres=Host=amas-postgres;Port=5432;Database=amas_core;Username=amas_user;Password=CAMBIAR_PASSWORD
Redis__Connection=amas-redis:6379
Redis__Password=CAMBIAR_PASSWORD
Jwt__Issuer=amas-api
Jwt__Audience=amas-client
Jwt__Secret=CAMBIAR_SECRET_LARGO_Y_SEGURO
Jwt__ExpirationMinutes=60
MediaStorage__Provider=Local
MediaStorage__LocalPath=storage/media
MediaStorage__PublicBaseUrl=/media
MediaStorage__MaxFileBytes=5242880
Swagger__Enabled=false
Cors__AllowedOrigins__0=https://amaslohaceposible.cloud
```

## Seguridad inicial

- Publicos: `GET /health`, `GET /api/v1/products`, `GET /api/v1/categories`, `GET /api/v1/configurations`.
- Protegidos con JWT Bearer: `POST/PUT/DELETE products`, `POST/PUT/DELETE categories`, `POST category images`, `PUT configurations`.
- Swagger queda activo en `Development`. En `Production` solo se habilita si `Swagger__Enabled=true`.
- `api/.env` contiene secretos locales y no debe subirse a Git.

## Traefik

No se usan labels Docker. El ejemplo versionado esta en `deploy/traefik/amas-api.yml`.
Copiarlo al VPS como:

```text
/opt/reverse-proxy/dynamic/amas-api.yml
```

```yaml
http:
  routers:
    amas-api:
      rule: "Host(`api.amaslohaceposible.cloud`)"
      entryPoints:
        - websecure
      tls:
        certResolver: le
      service: amas-api

  services:
    amas-api:
      loadBalancer:
        servers:
          - url: "http://amas-api:8080"
```
