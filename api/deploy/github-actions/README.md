# Deploy API con GitHub Actions

El workflow `.github/workflows/api-vps-deploy.yml` despliega la API al VPS por SSH.

## Secrets requeridos

Configurar en GitHub: `Settings > Secrets and variables > Actions`.

- `VPS_HOST`: IP o dominio del VPS.
- `VPS_USER`: usuario SSH con permisos para Docker.
- `VPS_SSH_KEY`: llave privada SSH para entrar al VPS.
- `VPS_PORT`: puerto SSH. Si no se define, usa `22`.
- `API_ENV_FILE`: contenido completo del `.env` de producción de la API.

## Variables opcionales

- `VPS_API_DIR`: carpeta destino en el VPS. Default: `/opt/amas-api`.
- `RUN_API_MIGRATIONS`: `true` o `false`. Default: `true`.

## Requisitos del VPS

- Docker y Docker Compose instalados.
- Usuario `VPS_USER` con permisos para ejecutar Docker.
- Redes Docker disponibles o creables:
  - `amas_net`
  - `traefik_proxy`
- PostgreSQL y Redis accesibles desde la red `amas_net`.

## Flujo

1. Compila la API en GitHub Actions.
2. Sube la carpeta `api/` al VPS por `rsync`.
3. Escribe el `.env` de producción desde `API_ENV_FILE`.
4. Ejecuta migraciones con un contenedor `mcr.microsoft.com/dotnet/sdk:10.0`.
5. Reconstruye y levanta `amas-api` con `docker compose up -d --build`.
6. Verifica `http://localhost:8080/health` en el VPS.
