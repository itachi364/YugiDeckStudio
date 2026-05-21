# YugiDeckStudio v0.1.0 - Contrato API

## 1. Convenciones

- Prefijo base backend: `/api`.
- Las respuestas usan JSON.
- Los errores de validación devuelven `400 Bad Request`.
- Los conflictos de ciclo de vida devuelven `409 Conflict`.
- En `v0.1.0`, antes de implementar autenticación y aislamiento multi-tienda, los endpoints de decks reciben `storeId` explícito. Cuando se implemente autenticación, `storeId` debe resolverse desde el usuario autenticado salvo para `root`.

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
