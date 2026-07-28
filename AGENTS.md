# Repository Guidelines

## Estructura del Proyecto y Organización de Módulos

Este repositorio es una aplicación Angular 20 para el landing y catálogo de AMAS. El código fuente está en `src/`. El punto de entrada es `src/main.ts`, los estilos globales están en `src/styles.css`, y la configuración raíz vive en `src/app/app.*` junto con `src/app/app.routes.ts`.

Las páginas están en `src/app/pages/` (`home`, `catalogo`, `impresion3d`, `papeleria-creativa`, `sublimacion`). Los componentes reutilizables están en `src/app/components/`, mientras que servicios, guards, configuración y tipos de API están en `src/app/core/`. Las pantallas administrativas están en `src/app/admin/`. Los archivos públicos van en `public/`; los assets de Angular se configuran desde `src/assets/`. Los archivos de despliegue incluyen `Dockerfile`, `nginx.conf`, `docker-compose.front.yml` y `deploy/front/`.

## Comandos de Desarrollo, Prueba y Build

- `npm start` o `ng serve`: ejecuta el servidor local en `http://localhost:4200/`.
- `npm run build`: genera el build de producción en `dist/`.
- `npm run watch`: recompila continuamente con configuración de desarrollo.
- `npm test`: ejecuta pruebas unitarias con Karma y Jasmine.
- `npx ng generate component components/name`: crea archivos Angular al agregar nueva UI.

## Estilo de Código y Convenciones de Nombres

Usa TypeScript en modo estricto y plantillas Angular estrictas; no relajes la configuración del compilador sin una razón clara. Sigue el patrón actual de componentes standalone: cada página o componente tiene archivos `.ts`, `.html`, `.css` y, cuando aplica, `.spec.ts` en la misma carpeta.

Usa kebab-case para archivos y rutas (`catalog-gallery`, `papeleria-creativa`) y PascalCase para clases exportadas (`CatalogGallery`, `PapeleriaCreativa`). El formato lo controla `prettier` en `package.json`: ancho de 100 caracteres y comillas simples. Mantén plantillas y estilos dentro del componente salvo que una regla sea realmente global.

## Guías de Pruebas

Las pruebas usan Jasmine/Karma con Angular TestBed. Ubica las pruebas junto a la implementación como `name.spec.ts`, siguiendo el patrón de `src/app/components/*` y `src/app/pages/*`. Agrega o actualiza pruebas cuando cambie el comportamiento de componentes, guards, servicios, rutas o manejo de API. Ejecuta `npm test` antes de abrir un PR y `npm run build` para validar rutas, plantillas y presupuestos de producción.

## Guías de Commits y Pull Requests

El historial reciente usa commits cortos e imperativos, a veces con Conventional Commits como `fix: point front to production api host` y `feat: prepare front updates for staging`. Prefiere `type: resumen` (`fix:`, `feat:`, `chore:`) cuando sea práctico; si no, usa resúmenes en español o inglés que sean breves y orientados a la acción.

Los pull requests deben incluir una descripción corta, pruebas realizadas, issue o contexto de despliegue si aplica, y capturas para cambios visibles de UI. Indica cualquier cambio en configuración de host de API, `public/runtime-config.js`, Docker o Nginx.

## Seguridad y Configuración

No subas secretos ni credenciales específicas de entorno. Cuando cambies conectividad con el backend, revisa en conjunto `src/app/core/api.config.ts`, `public/runtime-config.js` y los archivos de despliegue.

## Pendiente: Proceso Seguro de Migraciones

Antes de implementar mejoras de rendimiento para imágenes o cualquier cambio que toque backend/BD, ajustar primero el proceso de despliegue para proteger la base de datos de producción. El valor `RUN_API_MIGRATIONS` debe quedar en `false` para producción y las migraciones deben aplicarse solo mediante scripts SQL revisados.

Regla operativa: no ejecutar migraciones automáticas contra producción ni comandos que puedan recrear, truncar o borrar datos reales. Cada cambio debe ser incremental: nuevas columnas, índices, vistas, SP/funciones o tablas nuevas cuando aplique. Revisar el SQL generado antes de aplicarlo y validar que no contenga `DROP`, `TRUNCATE`, `DELETE` masivo ni seeds que sobrescriban información existente.

Flujo recomendado: generar migración, producir script SQL, probarlo en staging o copia de producción, tomar backup, aplicar manualmente el script aprobado y verificar catálogo, imágenes, productos, usuarios, roles y configuraciones. Después de asegurar este proceso, avanzar con la optimización de renderización de imágenes.
