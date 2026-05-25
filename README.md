# YugiDeckStudio

YugiDeckStudio `v0.1.0` es una aplicacion web local para cargar deck lists de Yu-Gi-Oh!, extraer cartas por OCR, resolver nombres con YGOPRODeck, cachear imagenes de cartas y generar una imagen compartible del deck con branding de tienda.

Esta version es local-only. No incluye despliegue a internet, Hostinger, AWS ni acceso publico fuera del entorno Docker local.

## Funcionalidades Principales

- Login local, registro de operadores y cambio obligatorio de contrasena para `root`.
- Administracion de usuarios, roles y permisos con aislamiento multi-tienda.
- Carga de deck list por imagen con metadatos de jugador, torneo, resultado y deck.
- Extraccion OCR y revision/correccion manual antes de generar imagenes.
- Resolucion de nombres de cartas y cache de metadatos desde YGOPRODeck.
- Cache permanente de imagenes de cartas en volumen Docker local.
- Configuracion de tienda, logos, fondo, tipos de eventos, tipos de torneos y redes sociales.
- Generacion de imagen final `1080x1350` en PNG.
- Previsualizacion y descarga local de la imagen generada.
- Depuracion de imagenes temporales despues de 7 dias.

## Arquitectura

- Backend: Clean Architecture / Hexagonal Architecture con NestJS.
- Frontend: React modular por features.
- Integraciones externas detras de puertos y adaptadores.
- Persistencia local con PostgreSQL y Prisma.
- Almacenamiento de imagenes en volumen Docker local.

## Stack Tecnologico

- Node.js `>=20.19.0`
- npm `>=11.0.0`
- Backend: NestJS + TypeScript
- Frontend: React + Vite + TypeScript
- Base de datos: PostgreSQL 16
- ORM: Prisma
- OCR: Tesseract OCR
- Render de imagen: node-canvas
- Pruebas backend: Jest
- Pruebas frontend: Vitest + Testing Library
- Runtime local: Docker Compose

## Estructura

```text
apps/
  backend/       API NestJS, casos de uso, adaptadores, Prisma y tests
  frontend/      UI React, features y tests de componente
packages/
  shared/        Paquete compartido
specs/           Requisitos, diseno, contrato API, diagramas y ADR
docker-compose.yml
.env.example
```

## Variables de Entorno

Usa `.env.example` como plantilla para un `.env` local. No subas `.env` al repositorio.

Variables principales:

```text
BACKEND_PORT=3000
FRONTEND_PORT=5173
IMAGE_STORAGE_PORT=8081
POSTGRES_DB=yugideckstudio
POSTGRES_USER=yugideck
POSTGRES_PASSWORD=yugideck_local_password
DATABASE_URL=postgresql://yugideck:yugideck_local_password@postgres:5432/yugideckstudio?schema=public
JWT_SECRET=replace_with_a_local_secret
ROOT_DEFAULT_USERNAME=root
ROOT_DEFAULT_PASSWORD=ChangeMe123!
IMAGE_STORAGE_PATH=/data/images
UPLOADED_DECKLIST_RETENTION_DAYS=7
GENERATED_IMAGE_RETENTION_DAYS=7
YGOPRODECK_API_BASE_URL=https://db.ygoprodeck.com/api/v7
```

El frontend consume la API con `/api` mediante el proxy de Nginx del contenedor. La previsualizacion de imagenes usa `http://127.0.0.1:8081` por defecto para servir los `storagePath` generados desde el volumen local.

## Ejecucion con Docker Compose

Levantar todo el entorno local:

```bash
docker compose up --build
```

Levantar en segundo plano:

```bash
docker compose up -d --build
```

Ver estado:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs -f
```

Detener servicios:

```bash
docker compose down
```

Servicios locales:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3000`
- Image storage: `http://127.0.0.1:8081`
- PostgreSQL: `127.0.0.1:5432`
- Image permissions: servicio one-shot que prepara permisos del volumen `yugideck_image_data`.

## Base de Datos

PostgreSQL corre en Docker y persiste datos en el volumen nombrado `yugideck_postgres_data`.

Generar Prisma Client:

```bash
npm run prisma:generate
```

Ejecutar migraciones:

```bash
npm run prisma:migrate
```

Ejecutar seed:

```bash
npm run prisma:seed
```

Reset local de volumenes, solo si quieres borrar datos locales:

```bash
docker compose down -v
```

## Usuario Root

La semilla local crea un unico usuario inicial:

- Usuario: `root`
- Contrasena temporal: `ChangeMe123!`

El primer login obliga a cambiar la contrasena antes de usar el resto de modulos.

## Flujo Local

1. Inicia sesion como `root` y cambia la contrasena temporal.
2. Crea o configura el primer administrador de tienda.
3. Configura tienda, logos, fondo, eventos, torneos y redes sociales.
4. Carga una imagen de deck list.
5. Ejecuta OCR y corrige las cartas si hace falta.
6. Resuelve nombres de cartas.
7. Cachea imagenes de cartas.
8. Genera la imagen final.
9. Previsualiza o descarga el PNG desde la pantalla `Imagen`.

## Imagenes y Retencion

El volumen `yugideck_image_data` guarda:

- Deck lists subidos: temporales.
- Imagenes finales generadas: temporales.
- Imagenes de cartas: permanentes.
- Logos de tienda, eventos y redes: permanentes.
- Fondos configurables: permanentes.

El backend e `image-cleaner` corren como usuario no-root. Docker Compose ejecuta el servicio `image-permissions` antes de iniciar esos servicios para que `/data/images` pueda escribirse sin ejecutar la aplicacion como root.

`image-cleaner` ejecuta depuracion cada `604800` segundos por defecto. Solo elimina assets temporales con retencion vencida.

Ver logs del limpiador:

```bash
docker compose logs -f image-cleaner
```

Ejecutar limpieza manual desde el workspace:

```bash
npm run maintenance:image-cleanup --workspace @yugideckstudio/backend
```

## Pruebas y Build

Instalar dependencias:

```bash
npm install
```

Lint/typecheck:

```bash
npm run lint
```

Pruebas:

```bash
npm test
```

Build:

```bash
npm run build
```

En Windows, Jest/Vitest/Vite pueden requerir ejecucion fuera del sandbox de Codex por errores `spawn EPERM`.

## API

El contrato esta documentado en `specs/api-contract.md`.

Endpoints principales:

- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `POST /api/auth/register`
- `GET /api/auth/users`
- `POST /api/decks/uploads`
- `POST /api/decks/{deckId}/extract`
- `PUT /api/decks/{deckId}/cards`
- `POST /api/decks/{deckId}/resolve-card-names`
- `POST /api/decks/{deckId}/cache-card-images`
- `POST /api/decks/{deckId}/generate-image`
- `POST /api/decks/{deckId}/inactivate`
- `GET /api/stores/{storeId}`
- `PUT /api/stores/{storeId}`
- `POST /api/stores/{storeId}/assets`
- `GET|POST|PUT /api/stores/{storeId}/event-types`
- `GET|POST|PUT /api/stores/{storeId}/tournament-types`
- `GET|PUT /api/stores/{storeId}/social-links`
- `POST /api/maintenance/image-cleanup/run`

## Observabilidad

El backend registra operaciones clave de OCR, YGOPRODeck, cache de imagenes, renderizado y depuracion. No se deben registrar secretos, contrasenas ni contenido de imagenes.

## Seguridad

- No hardcodear secretos reales.
- Usar `.env` local basado en `.env.example`.
- Los usuarios no-root solo acceden a su tienda.
- `root` es el unico rol con acceso global.
- Las contrasenas se almacenan hasheadas.
- Las imagenes subidas se validan por tipo MIME y tamano.

## Terraform / Infraestructura

`v0.1.0` no incluye infraestructura cloud ni Terraform ejecutable. La estrategia aprobada para esta fase es Docker Compose local. Cualquier despliegue externo debe definirse en una decision tecnica posterior y actualizar las especificaciones antes de implementarse.

## Git

- Rama base: `master`
- Rama de trabajo: `feature/v0.1.0-initial-setup`
- Repositorio remoto: `https://github.com/itachi364/YugiDeckStudio.git`
- Convencion de commits: Gitmoji.

Ejemplo:

```text
✨ feat(frontend): add generated deck image preview
```

## Troubleshooting

Login queda en `Validando`:

- Verifica que el frontend este en `http://127.0.0.1:5173`.
- Verifica que backend este healthy con `docker compose ps`.
- Revisa logs con `docker compose logs -f backend frontend`.

Imagen generada no se ve:

- Verifica que `image-storage` este arriba en `http://127.0.0.1:8081`.
- Revisa que la respuesta de generacion tenga `storagePath`.
- Confirma que el asset exista en el volumen `yugideck_image_data`.

Falla generacion por cache incompleta:

- Ejecuta primero `Cachear cartas` desde la pantalla `Imagen`.
- Si no hay internet y faltan cartas o imagenes, la generacion se bloquea por diseno.

Error `EACCES: permission denied, mkdir '/data/images/...'` al subir imagenes:

- Ejecuta `docker compose up --build -d --force-recreate image-permissions backend image-cleaner` para recrear el servicio `image-permissions`.
- Verifica permisos con `docker compose exec backend ls -ld /data/images`.
- El propietario esperado dentro del contenedor es `node node` o UID/GID `1000 1000`.

## Licencia

Licencia no definida para `v0.1.0`.
