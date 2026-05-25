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

Carga una imagen de deck list y registra los metadatos iniciales del deck.

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
| `playerName` | string | No vacío. |
| `tournamentDate` | string | Fecha ISO válida. |
| `resultLabel` | string | No vacío. Ejemplos: `Top 8`, `Ganador`. |
| `deckName` | string | No vacío. |

Campos opcionales:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `tournamentName` | string | Nombre del torneo. |
| `eventTypeId` | string | Tipo de evento configurado. |
| `tournamentTypeId` | string | Tipo de torneo configurado. |
| `location` | string | Ciudad o ubicación. |

Respuesta exitosa `201 Created`:

```json
{
  "deckId": "uuid",
  "playerId": "uuid",
  "tournamentId": "uuid",
  "uploadedImageAssetId": "uuid",
  "status": "UPLOADED",
  "extractionStatus": "PENDING",
  "reviewStatus": "PENDING"
}
```

Reglas:

- Debe almacenar físicamente la imagen en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- Debe persistir el asset como `UPLOADED_DECKLIST`.
- Debe usar política `TEMPORARY_CLEANUP_ALLOWED`.
- Debe persistir `Player`, `Tournament` y `Deck`.
- No debe existir un endpoint de reemplazo de imagen para el mismo deck.
- Si un caso de uso intenta cargar una nueva imagen para un deck que ya tiene `uploadedImageAssetId`, debe rechazarse con `409 Conflict`.

## 3. Extraer deck list por OCR

### `POST /api/decks/{deckId}/extract`

Ejecuta OCR sobre la imagen de deck list subida y persiste las cartas extraidas por seccion.

Parametros de ruta:

| Campo | Tipo | Reglas |
| --- | --- | --- |
| `deckId` | string | Debe existir en base de datos. |

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "status": "EXTRACTED",
  "extractionStatus": "EXTRACTED",
  "rawOcrText": "texto original del OCR",
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

- Debe leer la imagen desde el asset `UPLOADED_DECKLIST` asociado al deck.
- Debe conservar el texto original del OCR en `rawOcrText`.
- Debe detectar cartas de `MAIN`, `EXTRA` y `SIDE`.
- Debe persistir cantidad, nombre original, seccion y orden visual.
- Si el deck ya tiene cartas extraidas, debe rechazar la operacion con `409 Conflict`.
- Si no se detecta ninguna carta, debe marcar la extraccion como `FAILED` y devolver `400 Bad Request`.

## 4. Corregir cartas extraidas

### `PUT /api/decks/{deckId}/cards`

Reemplaza las cartas extraidas por OCR con la version corregida por el usuario antes de confirmar la revision.

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

- Solo se permite si el OCR fue ejecutado.
- Solo se permite mientras `reviewStatus` sea `PENDING`.
- Debe reemplazar la lista completa de cartas del deck.
- Las cartas corregidas quedan en `ResolutionStatus.UNRESOLVED` hasta la resolucion de nombres.

## 5. Confirmar revision OCR

### `POST /api/decks/{deckId}/review/confirm`

Confirma que el usuario reviso y corrigio las cartas extraidas.

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

- Solo se permite si el OCR fue ejecutado.
- El deck debe tener al menos una carta extraida o corregida.
- Al confirmar, `reviewStatus` cambia a `CONFIRMED` y `status` cambia a `REVIEWED`.
- La generacion de imagen debe bloquearse cuando `reviewStatus` no sea `CONFIRMED`.

## 6. Resolver nombres de cartas

### `POST /api/decks/{deckId}/resolve-card-names`

Intenta resolver las cartas extraidas o corregidas contra los nombres oficiales en ingles disponibles en el cache local de cartas. Si no hay coincidencia local, consulta YGOPRODeck con busqueda exacta `name` y luego busqueda difusa `fname`.

Respuesta exitosa `200 OK`:

```json
{
  "deckId": "uuid",
  "resolved": 1,
  "ambiguous": 1,
  "unresolved": 1,
  "cards": [
    {
      "deckCardId": "uuid",
      "originalName": "Blue Eyes White Dragon",
      "resolutionStatus": "RESOLVED",
      "resolvedEnglishName": "Blue-Eyes White Dragon",
      "cardId": "uuid"
    }
  ]
}
```

Reglas:

- Debe normalizar espacios, acentos, puntuacion y mayusculas/minusculas.
- Debe consultar cache local antes de llamar a YGOPRODeck.
- Si existe una unica coincidencia, la carta queda `RESOLVED`.
- Si existen varias coincidencias posibles, la carta queda `AMBIGUOUS`.
- Si no existe coincidencia local ni remota, la carta queda `UNRESOLVED`.
- No debe reemplazar silenciosamente cartas ambiguas.
- La informacion devuelta por YGOPRODeck debe persistirse en `Card` para usos posteriores.
- Si no hay conexion a YGOPRODeck y no existe cache local, la carta queda `UNRESOLVED`.

## 7. Cachear imagenes de cartas

### `POST /api/decks/{deckId}/cache-card-images`

Descarga y almacena de forma permanente las imagenes de las cartas resueltas del deck.

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

- Debe trabajar solo con cartas resueltas y vinculadas a `Card`.
- Si una carta ya tiene un asset activo asociado, no debe volver a descargar la imagen.
- Si falta `imageUrlSource` o falla la descarga, debe reportar la carta en `missing`.
- Las imagenes descargadas se almacenan en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- Las imagenes de cartas deben persistirse como `CARD_IMAGE`.
- Las imagenes de cartas deben usar politica `PERMANENT`.
- La depuracion semanal no debe eliminar imagenes de cartas.

## 8. Generar imagen del deck

### `POST /api/decks/{deckId}/generate-image`

Genera la imagen final del deck usando cartas resueltas, imagenes cacheadas y branding configurable.

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

La previsualizacion y descarga en frontend se construyen con `storagePath` servido por el servicio local `image-storage` sobre el mismo volumen Docker de imagenes.

Reglas:

- Solo se permite si la revision OCR fue confirmada.
- Todas las entradas del deck deben estar resueltas contra `Card`.
- Todas las cartas deben tener imagen cacheada activa.
- Si falta una carta o imagen, debe devolver `400 Bad Request` con la lista de dependencias faltantes.
- El renderer debe producir una imagen `1080x1350`.
- El fondo propio de tienda tiene prioridad sobre el color de fondo.
- Si no hay fondo propio activo, se usa `Store.backgroundColor`.
- La imagen generada se almacena en el volumen local configurado por `IMAGE_STORAGE_PATH`.
- La imagen generada debe persistirse como `GENERATED_DECK_IMAGE`.
- La imagen generada debe usar politica `TEMPORARY_CLEANUP_ALLOWED`.

## 9. Configuracion de tienda

Los endpoints de configuracion reciben `storeId` en ruta y validan el alcance de tienda contra el usuario autenticado salvo para `root`.

### `GET /api/stores/{storeId}`

Devuelve configuracion de tienda, redes, tipos de eventos y tipos de torneos.

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
| `category` | string | `STORE_LOGO`, `EVENT_LOGO`, `SOCIAL_LOGO` o `BACKGROUND_IMAGE`. |

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

### `GET /api/stores/{storeId}/event-types`

Lista tipos de eventos de la tienda.

### `POST /api/stores/{storeId}/event-types`

Crea un tipo de evento.

### `PUT /api/stores/{storeId}/event-types/{eventTypeId}`

Actualiza un tipo de evento de la tienda.

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
- Solo se actualizan tipos de eventos de la tienda indicada.

### `GET /api/stores/{storeId}/tournament-types`

Lista tipos de torneos de la tienda.

### `POST /api/stores/{storeId}/tournament-types`

Crea un tipo de torneo.

### `PUT /api/stores/{storeId}/tournament-types/{tournamentTypeId}`

Actualiza un tipo de torneo de la tienda.

Body:

```json
{
  "name": "Local",
  "description": "Torneo local semanal",
  "logoAssetId": "uuid",
  "isActive": true
}
```

Reglas:

- `logoAssetId`, cuando exista, debe apuntar a un asset `EVENT_LOGO`.
- Solo se actualizan tipos de torneos de la tienda indicada.

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

## 10. Autenticacion local

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

Body:

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

Body:

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

Body:

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

Body para crear tienda y admin:

```json
{
  "storeName": "Ready For Duel",
  "username": "admin",
  "password": "Admin123!",
  "displayName": "Store Admin",
  "email": "admin@example.com"
}
```

Body para usar tienda existente:

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

## 11. Roles, permisos y asignaciones

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

## 12. Ciclo de vida de decks

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
