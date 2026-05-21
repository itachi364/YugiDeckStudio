# ADR-005: Aislamiento de datos multi-tienda

## Estado

Propuesto

## Contexto

YugiDeckStudio debe permitir que varias tiendas usen la misma aplicación local.

Cada tienda debe ver únicamente su propia información. El único usuario con visibilidad global será `root`.

La aplicación almacenará datos sensibles para cada tienda: configuración, usuarios, decks, torneos, eventos, logos, redes sociales, imágenes generadas e imágenes de deck list subidas.

## Decisión

Implementar aislamiento multi-tienda desde `v0.1.0`.

Reglas:

- `root` tiene alcance global.
- `root` puede ver y administrar información de todas las tiendas.
- Solo puede existir un `root` en toda la aplicación.
- Cada tienda puede tener un solo `store_admin`.
- Cada tienda puede tener N usuarios `operator`.
- Todo usuario no-root debe estar vinculado a una tienda mediante `store_id`.
- Todo usuario no-root solo puede consultar y operar información de su `store_id`.
- El aislamiento debe aplicarse en backend, casos de uso y repositorios.
- El frontend puede ocultar información, pero no será la barrera de seguridad principal.

El contexto autenticado del usuario debe incluir:

- user_id.
- is_root.
- store_id cuando aplique.
- roles.
- permisos.

Los casos de uso deben recibir este contexto para validar alcance antes de ejecutar operaciones.

## Alternativas consideradas

### Filtrar solo en frontend

Se descarta porque no protege los datos si alguien llama directamente al backend.

### Una base de datos por tienda

Proporciona aislamiento fuerte, pero aumenta complejidad operativa y no es necesario para `v0.1.0`.

### Una instancia local por tienda

Simplifica aislamiento, pero impide que `root` administre todas las tiendas desde una sola instalación.

## Consecuencias

Positivas:

- El producto queda preparado para múltiples tiendas.
- Se reduce riesgo de fuga de información entre tiendas.
- `root` puede administrar globalmente la instalación.
- El modelo permite crecer a despliegue futuro multi-tenant.

Negativas:

- Todas las consultas relevantes deben considerar `store_id`.
- Requiere pruebas específicas de acceso cruzado entre tiendas.
- Requiere cuidado en reportes, búsquedas y endpoints administrativos.

## Reglas de prueba

- Un usuario de tienda A no puede ver datos de tienda B.
- Un usuario de tienda A no puede modificar datos de tienda B.
- `root` sí puede ver y administrar datos de tienda A y tienda B.
- Las consultas de repositorio aplican filtros por `store_id` cuando el usuario no es `root`.
