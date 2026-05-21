# YugiDeckStudio

YugiDeckStudio es una aplicación local para cargar deck lists de Yu-Gi-Oh!, extraer cartas por OCR, cachear información de YGOPRODeck y generar imágenes compartibles del deck con branding de tienda.

La versión `v0.1.0` es intencionalmente local-only. No incluye despliegue a internet, hosting cloud, AWS, Hostinger ni acceso público fuera del entorno Docker local.

## Stack

- Backend: NestJS + TypeScript
- Frontend: React + Vite + TypeScript
- Database: PostgreSQL
- ORM: Prisma
- OCR: Tesseract OCR
- Image rendering: node-canvas
- Backend tests: Jest
- Frontend tests: Vitest + Testing Library
- Local runtime: Docker Compose

## Servicios locales

- `backend`: API NestJS en el puerto `3000`.
- `frontend`: aplicación React en el puerto `5173`.
- `postgres`: PostgreSQL en el puerto `5432`.
- `image-storage`: servidor local de lectura del volumen de imágenes en el puerto `8081`.
- `image-cleaner`: proceso local que ejecuta la depuración de imágenes temporales cada 7 días.

## Configuración

Copia `.env.example` a `.env` solo para uso local y reemplaza los secretos locales.

Instalar dependencias:

```bash
npm install
```

Generar cliente Prisma:

```bash
npm run prisma:generate
```

Iniciar el entorno Docker local:

```bash
docker compose up --build
```

Detener el entorno Docker local:

```bash
docker compose down
```

Ver logs:

```bash
docker compose logs -f
```

## Depuración de imágenes

Las imágenes de deck list subidas y las imágenes finales generadas se consideran temporales y se depuran después de 7 días. Las imágenes de cartas, logos de tiendas, logos de eventos, logos de redes sociales y fondos configurables se consideran permanentes.

El servicio `image-cleaner` ejecuta el runner de mantenimiento cada `604800` segundos por defecto:

```bash
docker compose logs -f image-cleaner
```

También se puede ejecutar manualmente dentro del backend ya compilado:

```bash
npm run maintenance:image-cleanup --workspace @yugideckstudio/backend
```

## Pruebas

Ejecutar todas las pruebas:

```bash
npm test
```

Ejecutar pruebas backend:

```bash
npm run test --workspace @yugideckstudio/backend
```

Ejecutar pruebas frontend:

```bash
npm run test --workspace @yugideckstudio/frontend
```

## Usuario root

La semilla local debe crear un único usuario `root` inicial:

- usuario: `root`
- contraseña temporal: `ChangeMe123!`

El usuario root debe cambiar la contraseña en el primer inicio de sesión.

## Especificaciones

La fuente de verdad del desarrollo está en `specs/`.
