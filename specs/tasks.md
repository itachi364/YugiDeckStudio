# YugiDeckStudio v0.1.0 - Tareas

## Fase 1: Especificación y configuración del proyecto

- [x] TASK-001: Revisar y aprobar documentos SDD.
  - Archivos:
    - `specs/requirements.md`
    - `specs/design.md`
    - `specs/tasks.md`
  - Criterios de aceptación:
    - AC-001 hasta AC-036 documentados.
  - Criterios de finalización:
    - El usuario aprueba las especificaciones.

- [x] TASK-002: Crear repositorio GitHub después de aprobar SDD.
  - Criterios de aceptación:
    - Repositorio público `YugiDeckStudio` confirmado.
    - Rama base `master` confirmada.
    - Rama de trabajo `feature/v0.1.0-initial-setup` confirmada.
  - Criterios de finalización:
    - Repositorio GitHub creado solo después de confirmación explícita.

- [x] TASK-003: Crear estructura de proyecto para backend Clean/Hexagonal y frontend modular.
  - Archivos:
    - Proyecto backend NestJS + TypeScript.
    - Proyecto frontend React + Vite + TypeScript.
  - Criterios de aceptación:
    - NFR-001.
  - Criterios de finalización:
    - Estructura de carpetas creada y documentada.

## Fase 2: Infraestructura local

- [x] TASK-004: Generar configuración Docker Compose local.
  - Archivos:
    - `Dockerfile` según stack seleccionado.
    - `docker-compose.yml`.
    - `.dockerignore`.
    - `.env.example`.
  - Criterios de aceptación:
    - NFR-002.
    - NFR-003.
    - AC-035.
  - Criterios de finalización:
    - PostgreSQL configurado con volumen nombrado.
    - Volumen local de imágenes configurado.
    - Servicios sin secretos hardcodeados.
    - Sin configuración de despliegue a internet.

- [x] TASK-005: Generar esquema Prisma y migraciones.
  - Criterios de aceptación:
    - AC-032.
  - Criterios de finalización:
    - El esquema soporta tiendas, usuarios, roles, permisos, redes, eventos, torneos, decks, cartas, assets e imágenes generadas.

- [x] TASK-006: Diseñar almacenamiento local de imágenes.
  - Criterios de aceptación:
    - AC-008.
    - AC-033.
    - AC-034.
  - Criterios de finalización:
    - Categorías de assets implementadas.
    - Rutas, checksums, MIME types, tamaños y políticas de retención persistidos.
    - Cartas y logos marcados como permanentes.

- [x] TASK-007: Implementar proceso semanal de depuración de imágenes temporales.
  - Criterios de aceptación:
    - AC-033.
    - AC-034.
  - Pruebas:
    - Selección de imágenes depurables.
    - Protección de assets permanentes.
  - Criterios de finalización:
    - Servicio `image-cleaner` configurado en Docker Compose.
    - Endpoint manual `POST /api/maintenance/image-cleanup/run` disponible.
    - Runner backend `maintenance:image-cleanup` disponible.

## Fase 3: Backend

- [x] TASK-008: Implementar caso de uso de carga de deck.
  - Criterios de aceptación:
    - AC-001.
    - AC-002.
    - AC-023.
  - Pruebas:
    - Validación de metadatos.
    - Bloqueo de reemplazo de deck list.
  - Criterios de finalización:
    - Contrato `POST /api/decks/uploads` documentado.
    - Endpoint multipart implementado.
    - Imagen de deck list almacenada localmente como asset temporal.
    - Deck inicial persistido en estado `UPLOADED`.

- [x] TASK-009: Implementar puerto OCR y flujo de extracción.
  - Criterios de aceptación:
    - AC-003.
  - Pruebas:
    - Parsing de secciones.
    - Extracción de cantidades y nombres.
    - Adaptador Tesseract OCR con salida mockeada.
  - Criterios de finalización:
    - Contrato `POST /api/decks/{deckId}/extract` documentado.
    - `OcrPort` y adaptador Tesseract implementados.
    - Parser de secciones `MAIN`, `EXTRA` y `SIDE` implementado.
    - Texto OCR original persistido en `Deck.rawOcrText`.
    - Cartas extraídas persistidas como `DeckCard`.

- [x] TASK-010: Implementar revisión y corrección obligatoria.
  - Criterios de aceptación:
    - AC-004.
    - AC-022.
  - Pruebas:
    - Corrección de cartas no resueltas.
    - Bloqueo de generación sin revisión confirmada.
  - Criterios de finalización:
    - Contrato `PUT /api/decks/{deckId}/cards` documentado.
    - Contrato `POST /api/decks/{deckId}/review/confirm` documentado.
    - Corrección de cartas OCR implementada.
    - Confirmación de revisión implementada.
    - Política de bloqueo de generación sin revisión confirmada implementada.

- [x] TASK-011: Implementar resolución de nombres de cartas en inglés.
  - Criterios de aceptación:
    - AC-005.
  - Pruebas:
    - Normalización.
    - Cartas no resueltas y ambiguas.
  - Criterios de finalización:
    - Contrato `POST /api/decks/{deckId}/resolve-card-names` documentado.
    - Normalización de nombres implementada.
    - Resolución contra caché local de cartas implementada.
    - Estados `RESOLVED`, `AMBIGUOUS` y `UNRESOLVED` persistidos.

- [x] TASK-012: Implementar adaptador de YGOPRODeck.
  - Criterios de aceptación:
    - AC-006.
    - AC-007.
    - AC-028.
    - AC-029.
  - Pruebas:
    - Cliente HTTP mockeado.
    - Comportamiento cache-first.
    - Bloqueo cuando falta caché y no hay internet.
  - Criterios de finalización:
    - Adaptador YGOPRODeck cache-first implementado.
    - Búsqueda exacta `name` implementada.
    - Búsqueda difusa `fname` implementada como fallback.
    - Metadatos de cartas persistidos en caché local.
    - Fallo de conexión manejado sin romper la resolución.

- [x] TASK-013: Implementar caché permanente de imágenes de cartas.
  - Criterios de aceptación:
    - AC-008.
    - AC-034.
  - Pruebas:
    - Storage y cliente HTTP mockeados.
  - Criterios de finalización:
    - Contrato `POST /api/decks/{deckId}/cache-card-images` documentado.
    - Puerto `CardImageStoragePort` implementado.
    - Adaptador local de imágenes de cartas implementado.
    - Imágenes de cartas persistidas como `CARD_IMAGE` con retención `PERMANENT`.
    - Cartas con imagen ya cacheada no se descargan nuevamente.

- [x] TASK-014: Implementar generación de imagen del deck.
  - Criterios de aceptación:
    - AC-009.
    - AC-026.
    - AC-027.
    - AC-030.
    - AC-031.
  - Pruebas:
    - Composición del input de renderizado.
    - Fondo propio con prioridad.
    - Color de fondo cuando no hay fondo propio.
    - Metadatos de salida node-canvas.
  - Criterios de finalización:
    - Contrato `POST /api/decks/{deckId}/generate-image` documentado.
    - Puerto `DeckImageRendererPort` implementado.
    - Adaptador `node-canvas` implementado.
    - Generación `1080x1350` persistida como `GENERATED_DECK_IMAGE`.
    - Bloqueo por cartas o imágenes faltantes implementado.

- [x] TASK-015: Implementar configuración de tienda, eventos, torneos y redes sociales.
  - Criterios de aceptación:
    - AC-010.
  - Pruebas:
    - Configuración de tienda.
    - Tipos de eventos.
    - Tipos de torneos.
    - Redes sociales y logos permanentes.
  - Criterios de finalización:
    - Contratos de configuración de tienda documentados.
    - Endpoint de subida de assets configurables implementado.
    - Assets de logos, fondos e iconos persistidos como `PERMANENT`.
    - Configuración de tipos de eventos implementada.
    - Configuración de tipos de torneos implementada.
    - Configuración de redes sociales implementada.

- [x] TASK-016: Implementar autenticación local, root y primer admin de tienda.
  - Criterios de aceptación:
    - AC-011.
    - AC-012.
    - AC-013.
    - AC-014.
    - AC-016.
    - AC-017.
    - AC-018.
    - AC-019.
  - Pruebas:
    - Registro y login.
    - Hashing de contraseña.
    - Creación inicial de `root` con credenciales genéricas.
    - Cambio obligatorio de contraseña de `root`.
    - Único `root`.
    - Único `store_admin` por tienda.
    - N operadores por tienda.
  - Criterios de finalización:
    - Contratos de autenticación local documentados.
    - Seed inicial de `root` documentado e implementado.
    - Login JWT local implementado.
    - Cambio obligatorio de contraseña soportado.
    - Creación del primer administrador de tienda por `root` implementada.
    - Registro local de operadores implementado.

- [x] TASK-017: Implementar roles, permisos y asignaciones.
  - Criterios de aceptación:
    - AC-015.
    - AC-019.
  - Pruebas:
    - Roles.
    - Permisos.
    - Asignación de permisos a roles.
    - Asignación de roles a usuarios.
    - Autorización de operaciones protegidas.
  - Criterios de finalización:
    - Contratos de roles y permisos documentados.
    - Gestión de roles implementada.
    - Gestión de permisos implementada.
    - Asignación de permisos a roles implementada.
    - Asignación de roles a usuarios implementada.
    - Guard de autorización por permisos implementado.

- [x] TASK-018: Implementar aislamiento multi-tienda.
  - Criterios de aceptación:
    - AC-020.
    - AC-021.
  - Pruebas:
    - Filtros por `store_id`.
    - Bloqueo de acceso cruzado.
    - Acceso global solo para `root`.
  - Criterios de finalización:
    - Política de acceso por tienda implementada.
    - Guard para endpoints con `storeId` implementado.
    - Guard para endpoints con `deckId` implementado.
    - Endpoints de tiendas protegidos por alcance de tienda.
    - Endpoints de decks protegidos por alcance de tienda.

- [x] TASK-019: Implementar ciclo de vida de decks.
  - Criterios de aceptación:
    - AC-022.
    - AC-023.
    - AC-024.
    - AC-025.
  - Pruebas:
    - Revisión OCR obligatoria.
    - Impedir reemplazo de deck list.
    - Inactivación por `store_admin` o `root`.
    - Bloqueo de inactivación por `operator`.
    - Soft delete del deck.
  - Criterios de finalización:
    - Contrato `POST /api/decks/{deckId}/inactivate` documentado.
    - Inactivación de deck implementada.
    - Inactivación limitada a `root` y `store_admin`.
    - Soft delete con `status = INACTIVE` implementado.
    - Eliminación física de deck list e imágenes generadas implementada.

- [x] TASK-020: Implementar repositorios de persistencia.
  - Criterios de aceptación:
    - AC-032.
  - Pruebas:
    - Repositorios Prisma según casos de uso.
  - Criterios de finalización:
    - Puerto `DeckPersistenceRepository` implementado.
    - Adaptador Prisma `PostgresDeckPersistenceRepository` implementado.
    - `DeckReviewPolicyService` desacoplado de acceso directo a Prisma.
    - `InactivateDeckUseCase` desacoplado de acceso directo a Prisma.
    - Pruebas de repositorio y casos de uso actualizadas.

## Fase 4: Frontend

- [ ] TASK-021: Implementar UI de login, registro y cambio obligatorio de contraseña.
  - Criterios de aceptación:
    - AC-011.
    - AC-013.
  - Pruebas:
    - Registro.
    - Login.
    - Flujo de cambio obligatorio de contraseña.

- [ ] TASK-022: Implementar UI de usuarios, roles y permisos.
  - Criterios de aceptación:
    - AC-012.
    - AC-014.
    - AC-015.
    - AC-016.
    - AC-017.
    - AC-018.
    - AC-019.
    - AC-020.
    - AC-021.
  - Pruebas:
    - Usuarios.
    - Roles.
    - Permisos.
    - Acceso denegado por permisos insuficientes.
    - Aislamiento visual por tienda.

- [ ] TASK-023: Implementar UI de carga de deck.
  - Criterios de aceptación:
    - AC-001.
    - AC-002.
    - AC-023.
  - Pruebas:
    - Metadatos obligatorios.
    - Estado de subida.
    - Bloqueo de reemplazo.

- [ ] TASK-024: Implementar UI de revisión de extracción.
  - Criterios de aceptación:
    - AC-003.
    - AC-004.
    - AC-005.
    - AC-022.
  - Pruebas:
    - Corrección.
    - Entradas no resueltas.
    - Confirmación de revisión.

- [ ] TASK-025: Implementar UI de configuración de tienda.
  - Criterios de aceptación:
    - AC-010.
    - AC-026.
    - AC-027.
  - Pruebas:
    - Datos de tienda.
    - Logos.
    - Fondo propio.
    - Color de fondo.

- [ ] TASK-026: Implementar UI de eventos, torneos y redes sociales.
  - Criterios de aceptación:
    - AC-010.
  - Pruebas:
    - Tipos de eventos.
    - Tipos de torneos.
    - Redes sociales.

- [ ] TASK-027: Implementar UI de previsualización de imagen generada.
  - Criterios de aceptación:
    - AC-009.
    - AC-028.
    - AC-029.
    - AC-030.
    - AC-031.
  - Pruebas:
    - Previsualización.
    - Descarga.
    - Error por caché incompleta sin internet.

## Fase 5: Documentación y verificación

- [x] TASK-028: Generar o actualizar README.
  - Criterios de aceptación:
    - Definición de terminado SDD.
  - Criterios de finalización:
    - Setup local, comandos Docker, comandos de prueba, variables de entorno, volúmenes locales y arquitectura documentados.
    - El README debe indicar explícitamente que `v0.1.0` no incluye despliegue a internet.

- [x] TASK-029: Ejecutar pruebas y verificar criterios de aceptación.
  - Criterios de aceptación:
    - AC-036.
  - Criterios de finalización:
    - Resultados de pruebas reportados.

- [x] TASK-030: Preparar propuesta de commit con Gitmoji.
  - Criterios de aceptación:
    - Definición de terminado SDD.
  - Criterios de finalización:
    - Mensaje de commit propuesto antes de hacer commit.

## Decisiones de implementación abiertas

No quedan decisiones funcionales abiertas para iniciar `v0.1.0`.
