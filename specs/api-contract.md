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
