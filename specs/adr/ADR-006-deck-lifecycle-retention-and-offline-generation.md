# ADR-006: Ciclo de vida del deck, retención y generación sin internet

## Estado

Propuesto

## Contexto

YugiDeckStudio debe permitir cargar deck lists, corregir resultados importados desde Neuron, generar imágenes y conservar trazabilidad sin permitir que los operadores reemplacen información histórica después de generar una imagen.

También debe funcionar localmente y minimizar dependencia de internet cuando ya exista caché de cartas.

## Decisión

El ciclo de vida de un deck en `v0.1.0` tendrá estados:

- `uploaded`.
- `extracted`.
- `reviewed`.
- `image_generated`.
- `inactive`.

Reglas:

- Una vez subido un deck, no se puede reemplazar el deck list sobre el mismo registro.
- Antes de generar la imagen final, el operador puede revisar la composicion importada desde Neuron, agregar cartas faltantes y eliminar cartas incorrectas.
- La revision de importacion Neuron es obligatoria antes de generar imagen.
- Después de generar la imagen, el operador no puede eliminar ni inactivar el deck.
- Después de generar la imagen, solo `store_admin` o `root` pueden inactivar el deck.
- La inactivación del deck será soft delete o cambio de estado, conservando data histórica.
- Los archivos físicos de deck list subido e imagen generada sí pueden eliminarse por retención o inactivación administrativa.

La generación sin internet funcionará así:

- Si todas las cartas del deck y sus imágenes están cacheadas localmente, se puede generar la imagen.
- Si falta alguna carta o imagen y no hay conexión a YGOPRODeck, se bloquea la generación.
- El sistema debe informar qué cartas o imágenes faltan.

## Fondo de plantilla

La tienda puede configurar fondo propio o color de fondo.

Si existe fondo propio activo, se usa con prioridad. Si no existe, se usa el color configurado.

## Consecuencias

Positivas:

- Mejora trazabilidad del deck.
- Reduce errores de captura al importar desde una fuente estructurada y exigir revision.
- Evita pérdida total de datos con soft delete.
- Permite uso local sin internet cuando el caché está completo.

Negativas:

- Requiere estados y validaciones adicionales.
- Requiere pruebas específicas para transición de estados.
- Requiere reportar claramente cartas faltantes en modo sin internet.

## Pruebas requeridas

- No se puede reemplazar un deck list ya subido.
- No se puede generar imagen sin revision de importacion Neuron.
- `operator` no puede inactivar deck generado.
- `store_admin` y `root` pueden inactivar deck generado.
- La inactivación conserva data en base de datos.
- Los archivos físicos temporales se pueden eliminar según política.
- La generación sin internet funciona con caché completa.
- La generación sin internet se bloquea con caché incompleta.
