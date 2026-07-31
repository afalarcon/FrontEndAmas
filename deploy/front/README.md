# Deploy front AMAS en VPS

El front se construye como SPA Angular y se sirve con Nginx.

## Variables

Crear `.env` en la carpeta del front en el VPS:

```env
AMAS_API_BASE_URL=https://api.amaslohaceposible.cloud/api/v1
AMAS_WHATSAPP_NUMBER=573233550913
```

## Docker Compose

```bash
docker compose -f docker-compose.front.yml up -d --build
```

El contenedor expone internamente Nginx en `80` y publica `4200:80` para pruebas directas.
Para producción con Traefik, conectar el servicio `amas-front` a `traefik_proxy` y enrutar el dominio principal al puerto `80` del contenedor.

## Runtime config

`runtime-config.js` se genera al iniciar el contenedor con `AMAS_API_BASE_URL` y `AMAS_WHATSAPP_NUMBER`.
Esto evita recompilar el front si cambia el dominio de la API o el número de WhatsApp.

## GitHub Actions

El workflow `.github/workflows/front-vps-deploy.yml` despliega el front al VPS por SSH.

Secrets requeridos:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_PORT` opcional, default `22`

Variables opcionales:

- `VPS_FRONT_DIR`, default `/opt/amas-front`
- `AMAS_API_BASE_URL`, default `https://api.amaslohaceposible.cloud/api/v1`
- `AMAS_WHATSAPP_NUMBER`, default `573233550913`
