# ADR-003: Stack tecnológico para YugiDeckStudio v0.1.0

## Estado

Propuesto

## Contexto

YugiDeckStudio necesita una base técnica local, testeable y mantenible para construir una aplicación full-stack con backend HTTP, frontend web, OCR local, integración con YGOPRODeck, PostgreSQL local, renderizado de imágenes y Docker Compose.

El proyecto debe evitar costos de servicios externos durante `v0.1.0`.

## Decisión

Usar:

- Backend: NestJS + TypeScript.
- Frontend: React + Vite + TypeScript.
- OCR: Tesseract OCR.
- Renderizado de imágenes: node-canvas.
- ORM y migraciones: Prisma.
- Pruebas backend: Jest.
- Pruebas frontend: Vitest + Testing Library.
- Server state frontend: TanStack Query.
- Base de datos: PostgreSQL local en Docker.
- Ejecución: Docker Compose local.
- Repositorio GitHub: público.
- Rama base: `master`.
- Rama de trabajo inicial: `feature/v0.1.0-initial-setup`.
- Imagen generada: `1080x1350` px.
- Plantillas: una plantilla base parametrizable en `v0.1.0`.

## Justificación

NestJS aporta estructura para controladores, módulos, inyección de dependencias, providers, validación y pruebas. Esto encaja con Clean Architecture / Hexagonal Architecture porque permite separar controladores, casos de uso, puertos y adaptadores.

React permite construir la interfaz de usuario; Vite aporta un entorno liviano y rápido para React + TypeScript.

Tesseract OCR es open source y permite mantener el procesamiento OCR local, evitando costos por APIs externas.

node-canvas permite generar imágenes desde backend en Node.js, manteniendo el renderizado dentro del entorno Docker local.

Prisma aporta migraciones, tipado y acceso claro a PostgreSQL.

## Consecuencias

Positivas:

- Stack coherente en TypeScript para backend y frontend.
- Buena experiencia local de desarrollo.
- OCR sin costo externo.
- Renderizado local controlado.
- Migraciones versionadas con Prisma.
- Buen soporte para pruebas unitarias.

Negativas:

- Tesseract puede requerir preprocesamiento de imagen para mejorar precisión.
- node-canvas puede requerir dependencias nativas en Docker.
- NestJS introduce estructura y convenciones que deben respetarse.

## Decisiones pendientes relacionadas

No quedan decisiones de stack pendientes para iniciar `v0.1.0`.
