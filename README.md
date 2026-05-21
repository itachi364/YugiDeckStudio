# YugiDeckStudio

YugiDeckStudio is a local-first Yu-Gi-Oh! deck image generator.

Version `v0.1.0` is intentionally local-only. It does not include internet deployment, cloud hosting, AWS, Hostinger deployment or public access outside the local Docker environment.

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

## Local Services

- `backend`: NestJS API on port `3000`
- `frontend`: React app on port `5173`
- `postgres`: PostgreSQL on port `5432`
- `image-storage`: local image volume browser on port `8081`

## Setup

Copy `.env.example` to `.env` only for local use and replace local secrets.

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Start local Docker environment:

```bash
docker compose up --build
```

Stop local Docker environment:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f
```

## Tests

Run all workspace tests:

```bash
npm test
```

Run backend tests:

```bash
npm run test --workspace @yugideckstudio/backend
```

Run frontend tests:

```bash
npm run test --workspace @yugideckstudio/frontend
```

## Root User

The local seed creates one initial `root` user:

- username: `root`
- temporary password: `ChangeMe123!`

The root user must change the password on first login.

## Specifications

The source of truth for development is under `specs/`.
