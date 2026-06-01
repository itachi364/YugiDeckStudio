# YugiDeckStudio v0.1.0 - Contrato API

## 1. Convenciones

- Prefijo base backend: `/api`.
- Las respuestas usan JSON.
- Los errores de validación devuelven `400 Bad Request`.
- Los conflictos de ciclo de vida devuelven `409 Conflict`.
- En carga de decks, `storeId` se recibe de forma explicita para soportar el flujo local multi-tienda; el backend valida el alcance de tienda contra el usuario autenticado salvo para `root`.
- Desde la implementación de aislamiento multi-tienda, los endpoints con `storeId` o `deckId` requieren `Authorization: Bearer jwt`.
- `root` puede acceder a todas las tiendas.
- Los usuarios no-root solo pueden acceder a recursos cuyo `storeId` coincida con el `storeId` de su sesión.
- Si un usuario no-root intenta acceder a otra tienda, la API devuelve `403 Forbidden`.

## 2. Cargar deck list

### `POST /api/decks/uploads`

Carga una imagen de deck list como evidencia, exige un link publico de Yu-Gi-Oh! Neuron e importa la composicion inicial del deck desde Konami.

Content type:

```text
multipart/form-data
```

Archivo obligatorio:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `deckListImage` | file | Imagen `image/jpeg`, `image/png` o `image/webp`. |

El tamaño máximo se controla con `UPLOADED_DECKLIST_MAX_BYTES`. Valor local recomendado para `v0.1.0`: `10485760` bytes.

Campos obligatorios:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `storeId` | string | Debe existir en base de datos. |
| `neuronDeckUrl` | string | Link publico de Neuron o Konami DB. |
| `playerName` | string | No vacío. |
| `resultLabel` | string | Uno de: `Ganador`, `Segundo Puesto`, `Top 3 - 4`, `Top 8`. |
| `tournamentId` | string | Torneo abierto existente. |
| `deckName` | string | No vacío. |

Campos opcionales:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `tournamentDate` | string | Fecha ISO válida opcional para compatibilidad; la fecha operativa proviene del torneo seleccionado. |
| `location` | string | Ciudad o ubicación opcional para compatibilidad; la ubicación operativa proviene del torneo seleccionado. |

Respuesta exitosa `201 Created`:

```json
{
  "deckId": "uuid",
  "playerId": "uuid",
  "tournamentId": "uuid",
  "uploadedImageAssetId": "uuid",
  "status": "EXTRACTED",
  "extractionStatus": "EXTRACTED",
  "reviewStatus": "PENDING"
}
```

Reglas:

- Debe almacenar físicamente la imagen en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- Debe persistir el asset como `UPLOADED_DECKLIST`.
- Debe usar política `TEMPORARY_CLEANUP_ALLOWED`.
- Debe persistir `Player`, `Deck` y `DeckCard` importadas desde Neuron, asociadas al torneo existente seleccionado.
- Debe asociar el deck al torneo indicado y rechazar la carga si el torneo esta cerrado.
- Debe cerrar automaticamente el torneo cuando la carga complete la distribucion Top Cut exacta: 1 `Ganador`, 1 `Segundo Puesto`, 2 `Top 3 - 4` y 4 `Top 8`.
- No debe existir un endpoint de reemplazo de imagen ni de link Neuron para el mismo deck.
- Si un caso de uso intenta cargar una nueva imagen para un deck que ya tiene `uploadedImageAssetId`, debe rechazarse con `409 Conflict`.
- Debe rechazar links que no pertenezcan a `neuron.konami.net` o `www.db.yugioh-card.com`.
- Debe seguir redirecciones validas desde Neuron y parsear Main Deck, Extra Deck y Side Deck desde HTML estructurado.
- Si Neuron no responde o el HTML no contiene cartas parseables, debe rechazar la carga sin crear decks incompletos.

## 3. Consultar cartas importadas

### `GET /api/decks`

Lista decks visibles para la pantalla `Decks`.

Respuesta exitosa `200 OK`:

```json
[
  {
    "deckId": "uuid",
    "tournamentId": "uuid",
    "tournamentName": "Torneo Mes de Abril",
    "tournamentStatus": "OPEN",
    "storeId": "uuid",
    "storeName": "Ready For Duel",
    "playerName": "Michael Vanegas",
    "deckName": "White Forest",
    "resultLabel": "Top 4",
    "tournamentDate": "2026-05-21T00:00:00.000Z",
    "status": "EXTRACTED",
    "extractionStatus": "EXTRACTED",
    "reviewStatus": "PENDING",
    "cardCount": 42,
    "createdAt": "2026-05-26T00:00:00.000Z"
  }
]
```

Reglas:

- Requiere token valido.
- `root` recibe decks de todas las tiendas.
- Usuarios no-root reciben solo decks de su tienda vinculada.
- No devuelve decks inactivos.

### `GET /api/decks/{deckId}/cards`

Devuelve las cartas importadas desde Neuron para revision y correccion manual.

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "status": "EXTRACTED",
  "extractionStatus": "EXTRACTED",
  "reviewStatus": "PENDING",
  "source": "NEURON",
  "cards": [
    {
      "section": "MAIN",
      "quantity": 3,
      "originalName": "Silvy of the White Forest",
      "displayOrder": 1
    }
  ]
}
```

Reglas:

- Requiere token valido y acceso a la tienda del deck.
- No ejecuta OCR ni consulta la imagen subida.
- Devuelve la lista actualmente persistida para el deck.
- Devuelve `reviewStatus` persistido para que el frontend no asuma `PENDING` cuando el deck ya fue confirmado.

## 4. Corregir cartas importadas

### `PUT /api/decks/{deckId}/cards`

Reemplaza las cartas importadas desde Neuron con la version revisada por el usuario antes de confirmar el deck.

Parametros de ruta:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `deckId` | string | Debe existir en base de datos. |

Body:

```json
{
  "cards": [
    {
      "section": "MAIN",
      "quantity": 3,
      "originalName": "Silvy del Bosque Blanco",
      "displayOrder": 1
    }
  ]
}
```

Reglas:

- Solo se permite si el deck fue importado desde Neuron.
- Solo se permite mientras `reviewStatus` sea `PENDING`.
- Debe reemplazar la lista completa de cartas del deck.
- Las cartas revisadas se usan como fuente para consultar YGOPRODeck durante el cacheo de imagenes.

## 5. Confirmar revision de importacion

### `POST /api/decks/{deckId}/review/confirm`

Confirma que el usuario reviso la composicion del deck importado.

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "status": "REVIEWED",
  "reviewStatus": "CONFIRMED",
  "cardCount": 42
}
```

Reglas:

- Solo se permite si el deck fue importado desde Neuron.
- El deck debe tener al menos una carta extraida o corregida.
- La composicion debe ser valida: Main Deck entre 40 y 60 cartas, Extra Deck maximo 15 y Side Deck maximo 15.
- Al confirmar, `reviewStatus` cambia a `CONFIRMED` y `status` cambia a `REVIEWED`.
- La generacion de imagen debe bloquearse cuando `reviewStatus` no sea `CONFIRMED`.

## 6. Cachear imagenes de cartas

### `POST /api/decks/{deckId}/cache-card-images`

Descarga y almacena de forma permanente las imagenes de las cartas del deck confirmado o revisado, usando los nombres revisados para consultar YGOPRODeck cuando la carta aun no esta vinculada al cache local.

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "cached": [
    {
      "cardId": "uuid",
      "officialName": "Blue-Eyes White Dragon",
      "imageAssetId": "uuid",
      "storagePath": "card-images/89631139.jpg"
    }
  ],
  "alreadyCached": [],
  "missing": []
}
```

Reglas:

- Debe usar los nombres revisados del deck para buscar cartas en cache local o YGOPRODeck.
- Si una carta no existe en cache y YGOPRODeck no devuelve una coincidencia unica, debe reportarla en `missing`.
- Si una carta ya tiene un asset activo asociado, no debe volver a descargar la imagen.
- Si falta `imageUrlSource` o falla la descarga, debe reportar la carta en `missing`.
- Las imagenes descargadas se almacenan en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- Las imagenes de cartas deben persistirse como `CARD_IMAGE`.
- Las imagenes de cartas deben usar politica `PERMANENT`.
- La depuracion semanal no debe eliminar imagenes de cartas.

## 7. Generar imagen del deck

### `POST /api/decks/{deckId}/generate-image`

Genera la imagen final del deck usando cartas vinculadas a metadatos de YGOPRODeck, imagenes cacheadas y branding configurable.

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "generatedImageId": "uuid",
  "imageAssetId": "uuid",
  "storagePath": "generated-deck-images/uuid.png",
  "width": 1080,
  "height": 1350,
  "mimeType": "image/png",
  "status": "IMAGE_GENERATED"
}
```

La previsualizacion y descarga en frontend se construyen con `/images/<storagePath>`. El Nginx del frontend debe resolver esa ruta contra el servicio interno `image-storage` sobre el mismo volumen Docker de imagenes.

Reglas:

- Solo se permite si la revision de importacion Neuron fue confirmada.
- Todas las entradas del deck deben estar vinculadas a `Card` mediante el cacheo de imagenes.
- Todas las cartas deben tener imagen cacheada activa.
- Si falta una carta o imagen, debe devolver `400 Bad Request` con la lista de dependencias faltantes.
- El renderer debe producir una imagen `1080x1350`.
- El fondo propio de tienda tiene prioridad sobre el color de fondo.
- Si no hay fondo propio activo, se usa `Store.backgroundColor`.
- La imagen generada se almacena en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- La imagen generada debe persistirse como `GENERATED_DECK_IMAGE`.
- La imagen generada debe usar politica `TEMPORARY_CLEANUP_ALLOWED`.

## 8. Configuracion de tienda

Los endpoints de configuracion reciben `storeId` en ruta y validan el alcance de tienda contra el usuario autenticado salvo para `root`.

### `GET /api/stores`

Lista tiendas visibles para alimentar selectores de interfaz.

Respuesta exitosa `200 OK`:

```json
[
  {
    "id": "uuid",
    "name": "Ready For Duel"
  }
]
```

Reglas:

- Requiere token valido.
- `root` recibe todas las tiendas.
- Usuarios no-root reciben solo su tienda vinculada.

### `GET /api/stores/{storeId}`

Devuelve configuracion de tienda, redes, eventos y torneos.

### `POST /api/stores`

Crea una tienda desde el modulo de configuracion.

Body:

```json
{
  "name": "Ready For Duel",
  "backgroundColor": "#10131a",
  "sourceCreditText": "Source: ReadyForDuel"
}
```

Respuesta exitosa `201 Created`:

```json
{
  "id": "uuid",
  "name": "Ready For Duel",
  "primaryLogoAssetId": null,
  "secondaryLogoAssetId": null,
  "backgroundImageAssetId": null,
  "backgroundColor": "#10131a",
  "sourceCreditText": "Source: ReadyForDuel"
}
```

Reglas:

- Requiere token valido de `root`.
- No requiere seleccionar una tienda previa.
- `sourceCreditText` representa el credito inferior o fuente del deck list, no el encabezado principal de la imagen.

### `PUT /api/stores/{storeId}`

Actualiza configuracion base de tienda.

Body:

```json
{
  "name": "Ready For Duel",
  "primaryLogoAssetId": "uuid",
  "secondaryLogoAssetId": "uuid",
  "backgroundImageAssetId": "uuid",
  "backgroundColor": "#10131a",
  "sourceCreditText": "ReadyForDuel"
}
```

Reglas:

- `primaryLogoAssetId` y `secondaryLogoAssetId` deben apuntar a assets `STORE_LOGO`.
- `backgroundImageAssetId` debe apuntar a un asset `BACKGROUND_IMAGE`.
- `backgroundColor` debe ser hexadecimal `#RRGGBB`.

### `POST /api/stores/{storeId}/assets`

Sube logos, iconos y fondos configurables de tienda.

Content type:

```text
multipart/form-data
```

Archivo obligatorio:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `image` | file | Imagen `image/jpeg`, `image/png` o `image/webp`. |

Campos:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `category` | string | `STORE_LOGO`, `EVENT_LOGO`, `TOURNAMENT_LOGO`, `SOCIAL_LOGO` o `BACKGROUND_IMAGE`. |

Respuesta exitosa `201 Created`:

```json
{
  "imageAssetId": "uuid",
  "category": "STORE_LOGO",
  "storagePath": "store-logos/uuid.png",
  "retentionPolicy": "PERMANENT"
}
```

Reglas:

- Los assets configurables se almacenan en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- Los assets configurables deben persistirse con politica `PERMANENT`.
- La depuracion semanal no debe eliminar estos assets.

### `GET /api/stores/{storeId}/assets`

Lista assets configurables activos de una tienda para alimentar selectores.

Query params:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `category` | string | Opcional. `STORE_LOGO`, `EVENT_LOGO`, `TOURNAMENT_LOGO`, `SOCIAL_LOGO` o `BACKGROUND_IMAGE`. |

Respuesta exitosa `200 OK`:

```json
[
  {
    "id": "uuid",
    "category": "EVENT_LOGO",
    "originalFilename": "regional.png",
    "storagePath": "event-logos/uuid.png"
  }
]
```

Reglas:

- Requiere token valido.
- Valida alcance por `storeId`.
- No devuelve assets marcados con `deletedAt`.
- Si se envia `category`, solo devuelve assets de esa categoria.

### `GET /api/stores/{storeId}/event-types`

Lista eventos de la tienda.

### `GET /api/stores/event-types`

Lista eventos configurados visibles para el usuario autenticado.

Reglas:

- Requiere token valido.
- `root` recibe eventos de todas las tiendas.
- Usuarios no-root reciben solo eventos de su tienda vinculada.
- La respuesta incluye datos basicos de tienda para que `root` identifique el origen.

### `POST /api/stores/{storeId}/event-types`

Crea un evento.

### `PUT /api/stores/{storeId}/event-types/{eventTypeId}`

Actualiza un evento de la tienda.

Body:

```json
{
  "name": "Regional",
  "description": "WCQ Regional",
  "logoAssetId": "uuid",
  "isActive": true
}
```

Reglas:

- `logoAssetId`, cuando exista, debe apuntar a un asset `EVENT_LOGO`.
- Solo se actualizan eventos de la tienda indicada.
- `operator`, `store_admin` y `root` pueden crear o modificar eventos dentro de su alcance de tienda.
- En frontend, el logo de evento se carga desde el formulario de evento mediante `POST /api/stores/{storeId}/assets` con categoria `EVENT_LOGO`; luego se envia el `logoAssetId` creado.

### `DELETE /api/stores/{storeId}/event-types/{eventTypeId}`

Inactiva un evento configurado mediante soft delete.

Respuesta exitosa `200 OK`:

```json
{
  "id": "uuid",
  "storeId": "uuid",
  "name": "Regional",
  "isActive": false
}
```

Reglas:

- Solo `store_admin` o `root` pueden ejecutar esta operación.
- `operator` no puede eliminar eventos.
- La operación no borra físicamente el registro; actualiza `isActive = false`.
- Usuarios no-root solo pueden inactivar eventos de su tienda.

### `GET /api/stores/tournaments`

Lista torneos visibles para el usuario autenticado.

Reglas:

- `root` recibe torneos de todas las tiendas.
- Usuarios no-root reciben torneos de su tienda vinculada.
- La respuesta muestra el nombre del torneo como dato principal y el evento asociado como dato secundario.

### `GET /api/stores/{storeId}/tournaments`

Lista torneos de la tienda.

Query params:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `status` | string | Opcional. `OPEN` o `CLOSED`. |

### `POST /api/stores/{storeId}/tournaments`

Crea un torneo de la tienda asociado a un evento.

### `PUT /api/stores/{storeId}/tournaments/{tournamentId}`

Actualiza un torneo de la tienda.

Body:

```json
{
  "eventTypeId": "uuid",
  "name": "Torneo Mes de Abril",
  "description": "Top Cut mensual",
  "logoAssetId": "uuid",
  "eventDate": "2026-05-06",
  "location": "Bogota"
}
```

Reglas:

- `eventTypeId` debe apuntar a un evento de la misma tienda.
- `logoAssetId`, cuando exista, debe apuntar a un asset `TOURNAMENT_LOGO`.
- Solo se actualizan torneos de la tienda indicada.
- Los torneos se crean como `OPEN`; el estado solo pasa a `CLOSED` mediante cierre manual o automatico.
- Un torneo cerrado no debe aceptar nuevas cargas de decks.
- En frontend, la creacion de torneo se abre desde una fila de evento; el `eventTypeId` se toma del evento seleccionado.
- En frontend, el logo de torneo se carga desde el formulario de torneo mediante `POST /api/stores/{storeId}/assets` con categoria `TOURNAMENT_LOGO`; luego se envia el `logoAssetId` creado.

### `POST /api/stores/{storeId}/tournaments/{tournamentId}/close`

Cierra manualmente un torneo de la tienda.

Respuesta exitosa `200 OK`:

```json
{
  "id": "uuid",
  "storeId": "uuid",
  "name": "Torneo Mes de Abril",
  "status": "CLOSED",
  "closedAt": "2026-05-29T00:00:00.000Z"
}
```

Reglas:

- Requiere token valido y alcance de tienda.
- Solo se permite si el torneo tiene al menos un deck con resultado `Ganador`.
- Si ya esta cerrado, devuelve el torneo cerrado sin duplicar cierre.

### `GET /api/stores/{storeId}/social-links`

Lista redes sociales configuradas de la tienda.

### `PUT /api/stores/{storeId}/social-links`

Reemplaza la lista completa de redes sociales configuradas.

Body:

```json
{
  "links": [
    {
      "platform": "Instagram",
      "handle": "@readyforduel",
      "url": "https://instagram.com/readyforduel",
      "iconAssetId": "uuid",
      "displayOrder": 1,
      "isActive": true
    }
  ]
}
```

Reglas:

- `iconAssetId`, cuando exista, debe apuntar a un asset `SOCIAL_LOGO`.
- Reemplazar redes no elimina fisicamente los iconos; siguen siendo assets permanentes.
- En frontend, las redes sociales se administran desde configuracion de tienda mediante un modal `Crear redes sociales`.
- El modal permite enviar una o muchas redes sociales al tiempo para el `storeId` seleccionado.
- El logo de cada red social se carga desde su fila mediante `POST /api/stores/{storeId}/assets` con categoria `SOCIAL_LOGO`; luego se envia el `iconAssetId` creado.

## 9. Autenticacion local

### Cifrado de payloads sensibles

Los endpoints que reciben contrasenas deben recibir un sobre cifrado en lugar de campos sensibles en texto plano.

Primero el frontend obtiene la llave publica activa:

### `GET /api/auth/encryption-key`

Respuesta exitosa `200 OK`:

```json
{
  "keyId": "uuid",
  "algorithm": "RSA-OAEP-256+A256GCM",
  "publicKeyJwk": {}
}
```

Los endpoints sensibles reciben este formato:

```json
{
  "encryptedPayload": {
    "keyId": "uuid",
    "encryptedKey": "base64url",
    "iv": "base64url",
    "ciphertext": "base64url"
  }
}
```

El `ciphertext` contiene el JSON original cifrado con AES-GCM. `encryptedKey` contiene la llave AES cifrada con RSA-OAEP SHA-256.

### `POST /api/auth/root/initialize`

Crea el usuario `root` inicial y roles de sistema cuando todavia no existe root.

Respuesta exitosa `201 Created`:

```json
{
  "userId": "uuid",
  "username": "root",
  "mustChangePassword": true,
  "roles": ["root"]
}
```

Reglas:

- Solo puede existir un usuario `root`.
- El usuario inicial usa las variables `ROOT_DEFAULT_USERNAME` y `ROOT_DEFAULT_PASSWORD`.
- `mustChangePassword` debe quedar en `true`.
- Si ya existe root, devuelve `409 Conflict`.

### `POST /api/auth/login`

Inicia sesion local.

Payload logico antes de cifrar:

```json
{
  "username": "root",
  "password": "ChangeMe123!"
}
```

Respuesta exitosa `200 OK`:

```json
{
  "accessToken": "jwt",
  "expiresIn": "1d",
  "user": {
    "id": "uuid",
    "username": "root",
    "displayName": "Root",
    "storeId": null,
    "isRoot": true,
    "mustChangePassword": true,
    "roles": ["root"]
  }
}
```

Reglas:

- La contrasena se compara contra hash seguro.
- Si `mustChangePassword` es `true`, el frontend debe forzar cambio antes de permitir el resto del flujo.

### `POST /api/auth/change-password`

Cambia la contrasena del usuario autenticado.

Headers:

```text
Authorization: Bearer jwt
```

Payload logico antes de cifrar:

```json
{
  "currentPassword": "ChangeMe123!",
  "newPassword": "NewPassword123!"
}
```

Respuesta exitosa `200 OK`:

```json
{
  "userId": "uuid",
  "mustChangePassword": false
}
```

Reglas:

- Debe validar la contrasena actual.
- Debe almacenar la nueva contrasena hasheada.
- Debe limpiar `mustChangePassword`.

### `POST /api/auth/register`

Registra un usuario local no-root vinculado a una tienda. En `v0.1.0`, el registro local crea usuarios operativos con rol `operator`.

Payload logico antes de cifrar:

```json
{
  "storeId": "uuid",
  "username": "operator1",
  "password": "Operator123!",
  "displayName": "Operator One",
  "email": "operator@example.com"
}
```

Reglas:

- Los usuarios no-root deben quedar vinculados a una tienda.
- La contrasena se almacena hasheada.
- No se permite duplicar `username` o `email`.
- El registro no crea usuarios root.

### `POST /api/auth/root/store-admin`

Crea o parametriza el primer administrador de una tienda. Requiere token de `root` con `mustChangePassword = false`.

Headers:

```text
Authorization: Bearer jwt
```

Payload logico antes de cifrar para crear tienda y admin:

```json
{
  "storeName": "Ready For Duel",
  "username": "admin",
  "password": "Admin123!",
  "displayName": "Store Admin",
  "email": "admin@example.com"
}
```

Payload logico antes de cifrar para usar tienda existente:

```json
{
  "storeId": "uuid",
  "username": "admin",
  "password": "Admin123!",
  "displayName": "Store Admin"
}
```

Reglas:

- Solo `root` puede ejecutar este endpoint.
- Si `root.mustChangePassword` es `true`, se rechaza la operacion.
- Cada tienda puede tener un solo `store_admin`.
- El administrador creado queda vinculado a la tienda.

## 10. Roles, permisos y asignaciones

Los endpoints de roles y permisos requieren token valido y permiso `security.manage`. El usuario `root` puede ejecutarlos aunque no tenga permisos asignados explicitamente.

### `GET /api/auth/users`

Lista usuarios con tienda y roles asignados.

Reglas:

- Requiere token valido y permiso `security.manage`.
- `root` puede listar usuarios de todas las tiendas.
- Usuarios no-root con permiso `security.manage` solo deben recibir usuarios de su propia tienda.

### `GET /api/auth/roles`

Lista roles con sus permisos asignados.

### `POST /api/auth/roles`

Crea un rol.

Body:

```json
{
  "name": "judge",
  "description": "Juez de torneo",
  "isSystemRole": false
}
```

### `PUT /api/auth/roles/{roleId}`

Actualiza un rol.

Body:

```json
{
  "name": "judge",
  "description": "Juez de torneo",
  "isSystemRole": false
}
```

### `GET /api/auth/permissions`

Lista permisos.

### `POST /api/auth/permissions`

Crea un permiso.

Body:

```json
{
  "code": "security.manage",
  "description": "Administrar roles, permisos y asignaciones"
}
```

### `PUT /api/auth/permissions/{permissionId}`

Actualiza un permiso.

### `PUT /api/auth/roles/{roleId}/permissions`

Reemplaza la lista completa de permisos asignados a un rol.

Body:

```json
{
  "permissionIds": ["uuid"]
}
```

Reglas:

- El rol debe existir.
- Todos los permisos indicados deben existir.
- La asignacion reemplaza la lista completa.

### `PUT /api/auth/users/{userId}/roles`

Reemplaza la lista completa de roles asignados a un usuario.

Body:

```json
{
  "roleIds": ["uuid"]
}
```

Reglas:

- El usuario debe existir.
- Todos los roles indicados deben existir.
- No se puede asignar el rol `root` a un usuario no-root.
- Si se asigna `store_admin`, la tienda del usuario no debe tener otro administrador.
- La asignacion reemplaza la lista completa.

### Autorizacion por permisos

Reglas:

- Los endpoints protegidos declaran permisos requeridos.
- Si el usuario autenticado es `root`, se permite la operacion.
- Si `mustChangePassword` es `true`, se rechaza la operacion protegida.
- Para usuarios no-root, el backend consulta permisos desde roles asignados.
- Si faltan permisos, devuelve `403 Forbidden`.

## 11. Ciclo de vida de decks

### `POST /api/decks/{deckId}/inactivate`

Inactiva un deck con imagen generada. Requiere token valido y acceso a la tienda del deck.

Headers:

```text
Authorization: Bearer jwt
```

Body:

```json
{
  "reason": "Correccion solicitada"
}
```

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "status": "INACTIVE",
  "inactiveByUserId": "uuid",
  "inactivityReason": "Correccion solicitada",
  "removedImageStoragePaths": [
    "uploaded-decklists/uuid.png",
    "generated-deck-images/uuid.png"
  ]
}
```

Reglas:

- Solo `root` o `store_admin` pueden inactivar decks.
- `operator` no puede inactivar decks.
- Solo se permite inactivar decks con `status = IMAGE_GENERATED`.
- La inactivacion aplica soft delete sobre el deck con `status = INACTIVE`, `inactiveAt`, `inactiveByUserId` e `inactivityReason`.
- La inactivacion marca como eliminados los assets `UPLOADED_DECKLIST` y `GENERATED_DECK_IMAGE` asociados.
- La inactivacion elimina fisicamente los archivos de deck list subido e imagen generada.
- La inactivacion no elimina cartas, imagenes de cartas, logos, fondos, redes ni datos historicos del deck.
