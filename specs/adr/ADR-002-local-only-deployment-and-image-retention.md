# ADR-002: Ejecución local y retención de imágenes en YugiDeckStudio v0.1.0

## Estado

Propuesto

## Contexto

El objetivo de `v0.1.0` es construir YugiDeckStudio sin generar costos de despliegue mientras la aplicación no se haya vendido ni validado comercialmente.

El usuario cuenta con Hostinger Premium Web Hosting, pero ese plan no se considera suficiente para ejecutar el stack completo requerido con Docker Compose, PostgreSQL y almacenamiento local persistente de imágenes. También se decidió no depender de AWS, Oracle Cloud, VPS u otros proveedores en esta fase.

La aplicación necesita manejar varias clases de imágenes:

- Imágenes de deck list subidas.
- Imágenes finales generadas.
- Imágenes cacheadas de cartas desde YGOPRODeck.
- Logos de tiendas.
- Logos de eventos.
- Logos/iconos de redes sociales.
- Fondos o assets visuales de plantilla.

No todas las imágenes tienen la misma política de retención.

## Decisión

YugiDeckStudio `v0.1.0` será una aplicación local-only.

La ejecución se realizará con Docker Compose local e incluirá:

- Frontend.
- Backend.
- PostgreSQL.
- Volumen local para PostgreSQL.
- Volumen local para imágenes.
- Proceso local de depuración semanal de imágenes temporales.

No se diseñará ni implementará despliegue a internet en esta versión.

Las imágenes se clasificarán por categoría y política de retención.

Se podrán depurar semanalmente:

- Imágenes de deck list subidas.
- Imágenes finales generadas.

No se depurarán automáticamente:

- Imágenes cacheadas de cartas.
- Logos de tiendas.
- Logos de eventos.
- Logos/iconos de redes sociales.
- Fondos o assets activos de configuración.

PostgreSQL almacenará metadatos de imágenes, no los binarios principales.

## Alternativas consideradas

### Guardar imágenes directamente en PostgreSQL

Reduce infraestructura, pero puede inflar la base de datos, hacer backups más pesados y degradar el rendimiento para servir imágenes.

### Usar object storage cloud

Sería más escalable, pero introduce dependencia externa y posible costo futuro.

### Desplegar en Hostinger Premium Web Hosting

No se considera adecuado para el stack completo de backend, PostgreSQL, Docker y almacenamiento de imágenes.

### Usar un VPS o free tier cloud

Podría funcionar en el futuro, pero se descarta para `v0.1.0` para evitar costos, límites inciertos y administración de infraestructura.

## Consecuencias

Positivas:

- No hay costos de despliegue en `v0.1.0`.
- El entorno local es reproducible con Docker Compose.
- La arquitectura sigue siendo portable para un despliegue futuro.
- Las imágenes de cartas y logos importantes permanecen persistentes.
- Las imágenes temporales pueden limpiarse para controlar espacio en disco.

Negativas:

- La aplicación no estará disponible públicamente en internet.
- El usuario deberá ejecutar Docker localmente.
- Los backups locales quedan bajo responsabilidad del usuario.
- La generación y consulta dependen de los recursos de la máquina local.

## Decisiones pendientes

No quedan decisiones de despliegue local o retención pendientes para iniciar `v0.1.0`.
