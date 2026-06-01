# YugiDeckStudio

YugiDeckStudio `v0.1.0` es una aplicacion web local para cargar deck lists de Yu-Gi-Oh! como evidencia, importar la composicion desde un link publico de Yu-Gi-Oh! Neuron, revisar el deck, cachear imagenes de cartas con YGOPRODeck y generar una imagen compartible del deck con branding de tienda.

Esta version es local-only. No incluye despliegue a internet, Hostinger, AWS ni acceso publico fuera del entorno Docker local.

## Funcionalidades Principales

- Login local, registro de operadores y cambio obligatorio de contrasena para `root`.
- Cifrado de payloads con credenciales antes de enviarlos al backend local.
- Administracion de usuarios, roles y permisos con aislamiento multi-tienda.
- Carga de deck list por imagen como evidencia con metadatos de jugador, torneo, resultado, deck y link Neuron obligatorio.
- Importacion estructurada desde Yu-Gi-Oh! Neuron y revision/correccion manual de composicion antes de generar imagenes.
- Listado de decks visibles en la ventana de carga, con aislamiento por tienda y vista global para `root`.
- Cache de metadatos desde YGOPRODeck usando los nombres revisados.
- Cache permanente de imagenes de cartas en volumen Docker local.
- Configuracion de tienda, logos, fondo, eventos, torneos operativos y redes sociales.
- Generacion de imagen final `1080x1350` en PNG desde la pantalla `Decks`.
- Previsualizacion y descarga local de la imagen generada desde `Decks`, en modal desktop o vista mobile completa.
- Sesion local restaurable despues de F5 con cierre automatico tras 20 minutos de inactividad.
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

El frontend consume la API con `/api` mediante el proxy de Nginx del contenedor. La previsualizacion de imagenes usa `/images/<storagePath>` por el mismo frontend, y Nginx sirve esos archivos desde el servicio interno `image-storage`.

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
- Image storage: interno por Docker, expuesto al navegador mediante `http://127.0.0.1:5173/images/...`
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
3. Configura tienda, logos, fondo y redes sociales desde `Tienda`.
4. Configura eventos desde `Catalogos`; desde cada evento usa `Crear torneo` para abrir el modal de torneo asociado.
5. Carga una imagen de deck list, selecciona un torneo abierto, selecciona el resultado e incluye el link publico de Neuron.
6. Desde el resultado de carga o el listado de decks, abre `Revisar deck`.
7. Revisa/corrige la composicion y confirma el deck.
8. Desde la fila del deck confirmado en `Decks`, usa `Generar imagen`.
9. En desktop, la revision y la generacion se abren en modales. En celular, se abren como vistas completas con accion `Volver`.
10. La aplicacion cachea cartas, genera la imagen final y muestra la previsualizacion.
11. Descarga el PNG desde el panel de resultado.

## Sesion Local

El frontend guarda la sesion autenticada en `localStorage` para que un refresco con F5 no obligue a iniciar sesion de nuevo.

Reglas aplicadas:

- La sesion se restaura si la ultima actividad fue hace menos de 20 minutos.
- Click, teclado, scroll, touch y foco de ventana actualizan la actividad.
- Despues de 20 minutos sin actividad, la aplicacion elimina el token local y vuelve al login.
- Cerrar sesion en una pestana sincroniza el cierre con otras pestanas abiertas del mismo navegador.

El timeout de inactividad es una proteccion de frontend local. La expiracion criptografica del JWT sigue dependiendo de la configuracion del backend.

## Seguridad de Credenciales

Los formularios que envian contrasenas usan un sobre cifrado antes del `fetch`.

Flujo local:

1. El frontend solicita `GET /api/auth/encryption-key`.
2. El navegador cifra el JSON sensible con AES-GCM.
3. La llave AES se cifra con RSA-OAEP SHA-256 usando la llave publica activa del backend.
4. El backend descifra el sobre en la capa HTTP y ejecuta los casos de uso existentes.

Esto evita que el payload JSON muestre contrasenas en texto plano en DevTools. Para despliegues fuera de localhost, HTTPS/TLS sigue siendo obligatorio como cifrado de transporte.

## Imagenes y Retencion

El volumen `yugideck_image_data` guarda:

- Deck lists subidos: temporales.
- Imagenes finales generadas: temporales.
- Imagenes de cartas: permanentes.
- Logos de tienda, eventos y redes: permanentes.
- Logos de torneos: permanentes.
- Fondos configurables: permanentes.

Los logos de eventos, torneos y redes se cargan directamente desde sus formularios. Las redes sociales se crean desde la configuracion de tienda con un modal que permite guardar una o varias redes para el `storeId` seleccionado.

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
- `GET /api/decks`
- `GET /api/decks/{deckId}/cards`
- `PUT /api/decks/{deckId}/cards`
- `POST /api/decks/{deckId}/cache-card-images`
- `POST /api/decks/{deckId}/generate-image`
- `POST /api/decks/{deckId}/inactivate`
- `GET /api/stores/{storeId}`
- `PUT /api/stores/{storeId}`
- `POST /api/stores/{storeId}/assets`
- `GET|POST|PUT /api/stores/{storeId}/event-types`
- `GET /api/stores/tournaments`
- `GET|POST|PUT /api/stores/{storeId}/tournaments`
- `POST /api/stores/{storeId}/tournaments/{tournamentId}/close`
- `GET|PUT /api/stores/{storeId}/social-links`
- `POST /api/maintenance/image-cleanup/run`

## Observabilidad

El backend registra operaciones clave de importacion Neuron, YGOPRODeck, cache de imagenes, renderizado y depuracion. No se deben registrar secretos, contrasenas ni contenido de imagenes.

## Seguridad

- No hardcodear secretos reales.
- Usar `.env` local basado en `.env.example`.
- Los usuarios no-root solo acceden a su tienda.
- `root` es el unico rol con acceso global.
- Las contrasenas se almacenan hasheadas.
- La sesion persistida en navegador se limpia automaticamente despues de 20 minutos de inactividad.
- Las imagenes subidas se validan por tipo MIME y tamano.
- Los links de Neuron se restringen a dominios Konami permitidos para reducir riesgo SSRF.

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

- Verifica que `frontend` e `image-storage` esten arriba con `docker compose ps`.
- Abre la imagen mediante `http://127.0.0.1:5173/images/<storagePath>`.
- Revisa que la respuesta de generacion tenga `storagePath`.
- Confirma que el asset exista en el volumen `yugideck_image_data`.

Falla generacion por cache incompleta:

- Usa `Generar imagen` desde la fila del deck en `Decks`; el flujo cachea cartas antes de generar.
- Si no hay internet y faltan cartas o imagenes, la generacion se bloquea por diseno.

Error `EACCES: permission denied, mkdir '/data/images/...'` al subir imagenes:

- Ejecuta `docker compose up --build -d --force-recreate image-permissions backend image-cleaner` para recrear el servicio `image-permissions`.
- Verifica permisos con `docker compose exec backend ls -ld /data/images`.
- El propietario esperado dentro del contenedor es `node node` o UID/GID `1000 1000`.

## Licencia

Licencia no definida para `v0.1.0`.
