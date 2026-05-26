# ADR-004: Autenticación local, root, roles y permisos

## Estado

Propuesto

## Contexto

YugiDeckStudio `v0.1.0` será local-only, pero necesita login, registro de usuarios, un usuario `root`, administradores de tienda y operadores por tienda.

También se requiere un módulo para configurar tipos de usuarios y permisos.

## Decisión

Implementar autenticación y autorización local en `v0.1.0`.

La aplicación tendrá:

- Registro de usuarios.
- Login local.
- Usuario `root` inicial creado como primer usuario de la base de datos.
- Credenciales genéricas locales para `root`: usuario `root`, contraseña temporal `ChangeMe123!`.
- Cambio obligatorio de contraseña de `root` en el primer inicio de sesión.
- Un único `root` para toda la aplicación.
- Un único `store_admin` por tienda.
- N usuarios `operator` por tienda.
- Roles o tipos de usuario.
- Permisos.
- Asignación de roles a usuarios.
- Asignación de permisos a roles.
- Validación de permisos en operaciones protegidas.
- Aislamiento de datos por tienda para usuarios no-root.

La autorización se basará en permisos, no solo en nombres de roles.

Las contraseñas se almacenarán con hashing seguro y nunca en texto plano.

El usuario `root` tendrá todos los permisos y podrá ver información de todas las tiendas.

Los usuarios no-root estarán vinculados a una tienda y solo podrán ver u operar información de esa tienda.

## Roles iniciales

- `root`: máximo privilegio local, encargado de inicialización y administración de seguridad.
- `store_admin`: administrador de tienda. En la UI debe mostrarse como "Administrador de tienda".
- `operator`: usuario operativo para carga de decks y generación de imágenes.

## Permisos iniciales

- `root`: todos los permisos sobre todas las tiendas.
- `store_admin`: administrar configuración, eventos, torneos, redes, logos, usuarios operadores, decks e imágenes de su tienda.
- `operator`: subir deck lists, revisar importacion, corregir cartas antes de generación, generar imágenes y descargar imágenes de su tienda.

## Reglas de creación de usuarios

- Solo `root` puede crear tiendas.
- Solo `root` puede crear o parametrizar el primer `store_admin` de una tienda.
- `root` puede crear operadores en cualquier tienda.
- `store_admin` puede crear operadores solo en su tienda.
- `operator` no puede crear usuarios.

## Consecuencias

Positivas:

- El producto queda mejor preparado para venta.
- La tienda puede tener perfiles diferenciados.
- Las operaciones críticas quedan protegidas desde la primera versión.
- El modelo de permisos permite crecer sin rediseñar seguridad.
- El aislamiento por tienda queda definido desde el inicio.

Negativas:

- Aumenta el alcance de `v0.1.0`.
- Requiere más pruebas unitarias y de autorización.
- Requiere aplicar filtros por tienda de forma consistente en casos de uso y repositorios.

## Decisiones pendientes

No quedan decisiones de autenticación, roles o permisos pendientes para iniciar `v0.1.0`.
