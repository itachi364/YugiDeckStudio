# YugiDeckStudio v0.1.0 - Requisitos

## 1. Propósito

YugiDeckStudio es una aplicación web local con frontend y backend para visualización de decks de torneos de Yu-Gi-Oh!.

La aplicación permite que una tienda u organizador de torneos suba una imagen de deck list, extraiga la lista de cartas, resuelva los nombres de las cartas en inglés, obtenga metadatos e imágenes desde YGOPRODeck, persista la información resultante en PostgreSQL y genere una imagen compartible del deck similar a gráficos de Top Cut.

## 2. Alcance

La versión `v0.1.0` se enfoca en ejecución local únicamente.

Incluye:

- Subir una imagen de deck list.
- Capturar metadatos del jugador, torneo y deck.
- Extraer nombres y cantidades de cartas desde la imagen subida.
- Resolver los nombres de cartas a su nombre en inglés.
- Buscar cartas en la API de YGOPRODeck.
- Persistir información de deck, cartas, jugador, torneo, configuración e imagen generada.
- Guardar imágenes en almacenamiento local administrado por Docker.
- Generar una imagen final del deck con branding y redes sociales configurables.
- Generar la imagen final en formato `1080x1350` px.
- Usar una plantilla base parametrizable para `v0.1.0`.
- Configurar tiendas, redes sociales, tipos de eventos y tipos de torneos.
- Registrar usuarios e iniciar sesión.
- Crear un único usuario `root` local inicial.
- Forzar cambio de contraseña de `root` en el primer inicio de sesión.
- Permitir que `root` configure el primer usuario administrador de tienda.
- Configurar tipos de usuario/roles y permisos.
- Soportar múltiples tiendas con aislamiento de información por tienda.
- Exigir revisión OCR obligatoria antes de generar imágenes.
- Aplicar ciclo de vida de decks con corrección previa a generación y soft delete posterior.
- Ejecutar una depuración semanal de imágenes temporales.
- Usar Tesseract OCR como motor OCR local y open source.
- Usar node-canvas para renderizar imágenes del deck.

No incluye en `v0.1.0`:

- Despliegue a internet.
- Despliegue en Hostinger, AWS, Oracle Cloud u otro proveedor.
- Alta disponibilidad.
- CDN.
- Acceso público desde fuera de la máquina o red local donde se ejecute Docker.

Los links de Yu-Gi-Oh! Neuron quedan fuera del alcance de importación automática en `v0.1.0`, porque el link entregado parece requerir un dispositivo con Yu-Gi-Oh! Neuron instalado o un flujo de deep link específico de la app. La fuente de importación soportada para esta versión será la imagen de deck list subida.

## 3. Referencias externas

- Guía de API de YGOPRODeck: https://ygoprodeck.com/api-guide/
- Endpoint de información de cartas: `https://db.ygoprodeck.com/api/v7/cardinfo.php`

Restricciones importantes de integración:

- La API soporta búsqueda por `name` exacto, `fname` difuso y múltiples nombres separados por `|`.
- La información de imágenes de cartas se devuelve en `card_images`.
- YGOPRODeck advierte que no se deben hotlinkear imágenes de forma continua. YugiDeckStudio debe descargar/cachear/rehostear las imágenes en lugar de depender de hotlinks permanentes.
- La documentación indica un límite de 20 solicitudes por segundo.

## 4. Actores

- Root: usuario único de la aplicación, con acceso global a todas las tiendas.
- Administrador de tienda: usuario `store_admin`, único por tienda, mostrado en UI como "Administrador de tienda".
- Operador de torneo: usuario `operator`, pertenece a una tienda y opera únicamente datos de esa tienda.
- Visualizador local: consulta o descarga la imagen generada del deck desde la aplicación local cuando tenga permisos.

## 5. Requisitos funcionales

### REQ-001: Subir imagen de deck list

La aplicación debe permitir que un operador suba una imagen de deck list.

Metadatos obligatorios durante la carga:

- Nombre del jugador.
- Fecha del torneo.
- Resultado del torneo, ya sea posición de Top o estado de ganador.
- Nombre del deck usado.

Metadatos opcionales:

- Nombre del torneo.
- Tipo de torneo configurado.
- Tipo de evento configurado.
- Nombre de tienda u organizador.
- Ciudad o ubicación del evento.

### REQ-002: Extraer deck list desde imagen

La aplicación debe procesar la imagen de deck list subida y extraer cantidades, nombres de cartas y secciones: Main Deck, Extra Deck y Side Deck.

La aplicación debe conservar el texto original extraído para auditoría y corrección.

### REQ-003: Resolver nombres de cartas en inglés

La aplicación debe resolver los nombres extraídos a nombres de cartas en inglés antes de consultar YGOPRODeck.

La aplicación debe permitir corrección manual cuando el OCR o la resolución de nombres falle.

### REQ-004: Obtener información de cartas desde YGOPRODeck

La aplicación debe consultar YGOPRODeck para obtener metadatos e imágenes de cartas.

La aplicación debe usar datos cacheados cuando estén disponibles antes de realizar solicitudes externas.

La aplicación debe evitar exceder los límites de solicitudes de YGOPRODeck.

### REQ-005: Cachear imágenes de cartas

La aplicación debe descargar y almacenar imágenes de cartas en almacenamiento local persistente administrado por Docker, en lugar de usar imágenes de YGOPRODeck como hotlinks permanentes.

Las imágenes cacheadas de cartas se consideran assets permanentes y no deben ser eliminadas por el proceso semanal de depuración.

### REQ-006: Persistir información del deck

La aplicación debe persistir metadatos de deck list subida, jugador, torneo, deck, secciones, cantidades, cartas resueltas, imagen generada y configuración de tienda.

### REQ-007: Generar imagen del deck

La aplicación debe generar una imagen compartible similar a la referencia visual suministrada.

La imagen generada debe incluir Main Deck, Extra Deck, Side Deck, nombre del jugador, fecha del torneo, resultado, nombre del deck, tipo de evento o torneo cuando aplique, logos, redes sociales y credito inferior/fuente del deck list.

### REQ-008: Configurar tienda, eventos, torneos y redes sociales

La aplicación debe permitir configurar datos de tienda, logos, tipos de eventos, tipos de torneos, redes sociales, logos/iconos de redes sociales, credito inferior/fuente del deck list, fondo propio y color de fondo.

Los logos de tiendas, logos de eventos y logos/iconos de redes sociales se consideran assets permanentes y no deben ser eliminados por el proceso semanal de depuración.

### REQ-009: Registro, login y sesión local

La aplicación debe permitir registro e inicio de sesión de usuarios locales.

El usuario `root` debe crearse como primer usuario de la base de datos con credenciales genéricas locales:

- Usuario: `root`.
- Contraseña temporal: `ChangeMe123!`.

El usuario `root` debe cambiar su contraseña obligatoriamente en el primer inicio de sesión.

### REQ-010: Roles, permisos y usuarios por tienda

Reglas:

- Solo puede existir un usuario `root` en toda la aplicación.
- Cada tienda puede tener un solo `store_admin`.
- Cada tienda puede tener N usuarios `operator`.
- Solo `root` puede crear tiendas.
- Solo `root` puede crear o parametrizar el primer `store_admin` de una tienda.
- `root` puede crear operadores en cualquier tienda.
- `store_admin` puede crear operadores únicamente en su tienda.
- `operator` no puede crear usuarios.
- En frontend, la pantalla de registro de usuarios solo debe mostrarse después de iniciar sesión y únicamente para `root`.
- En frontend, la pantalla de cambio de contraseña no debe aparecer como opción de navegación; solo debe mostrarse por redirección inmediata cuando `mustChangePassword = true`.
- En frontend, antes de iniciar sesión solo debe mostrarse la opción de login; los módulos autenticados no deben mostrarse deshabilitados.
- Los usuarios no-root deben quedar vinculados a una tienda.
- Los usuarios no-root solo deben ver y operar información de su tienda.
- El aislamiento por tienda debe aplicarse en backend mediante filtros y validaciones por `store_id`, no solo en frontend.

Permisos iniciales:

- `root`: todos los permisos sobre todas las tiendas.
- `store_admin`: administrar configuración, eventos, torneos, redes, logos, usuarios operadores, decks e imágenes de su tienda.
- `operator`: subir deck lists, revisar extracción, corregir cartas antes de generación, generar imágenes y descargar imágenes de su tienda.

### REQ-011: Previsualizar y descargar

La aplicación debe permitir previsualizar y descargar la imagen generada desde el entorno local cuando el usuario tenga permisos.

### REQ-012: Ciclo de vida de decks

Una vez subido un deck, no debe permitirse recargar o reemplazar el deck list sobre el mismo registro.

Antes de generar la imagen final, el operador debe poder corregir la extracción OCR y nombres de cartas.

La revisión OCR debe ser obligatoria antes de generar la imagen.

Después de generar la imagen, solo `store_admin` o `root` pueden inactivar el deck para permitir que el operador cargue un nuevo deck.

La inactivación del deck debe ser soft delete o cambio de estado, sin eliminar la data histórica de base de datos.

Cuando un deck se inactiva o cumple política de retención, los archivos físicos de deck list subido e imagen generada sí pueden eliminarse según reglas de retención.

### REQ-013: Fondo parametrizable

La tienda debe poder configurar un fondo propio o un color de fondo para la plantilla base.

Si existe fondo propio activo, debe usarse como prioridad sobre el color.

Si no existe fondo propio, debe usarse el color configurado por la tienda.

### REQ-014: Modo sin internet

La aplicación debe poder generar imágenes sin conexión a internet únicamente cuando todas las cartas del deck y sus imágenes ya existan en caché local.

Si falta alguna carta o imagen y no hay conexión a YGOPRODeck, la generación debe bloquearse e informar cuáles cartas faltan.

### REQ-015: Almacenamiento local de imágenes

La aplicación debe usar un volumen Docker local para almacenar imágenes de deck list subidas, imágenes finales generadas, imágenes cacheadas de cartas, logos de tiendas, logos de eventos y logos/iconos de redes sociales.

PostgreSQL debe almacenar metadatos, rutas, tamaños, checksums, tipos MIME, fechas de creación, fechas de último uso y categoría de retención.

### REQ-016: Depuración semanal de imágenes temporales

La aplicación debe ejecutar o permitir ejecutar un proceso semanal de depuración local.

El proceso debe poder eliminar únicamente imágenes de deck list subidas e imágenes finales generadas con antigüedad mayor o igual a 7 días.

El proceso no debe eliminar imágenes cacheadas de cartas, logos de tiendas, logos de eventos, logos/iconos de redes sociales ni assets activos referenciados por configuración vigente.

### REQ-017: Ejecución local

La aplicación debe ejecutarse localmente mediante Docker Compose.

La aplicación no debe requerir una cuenta cloud ni un proveedor externo de despliegue para funcionar en `v0.1.0`, excepto la conexión a internet necesaria para consultar YGOPRODeck cuando no exista caché local.

### REQ-018: Pruebas requeridas

Toda funcionalidad backend o frontend generada debe incluir pruebas unitarias que cubran sus criterios de aceptación relacionados.

## 6. Requisitos no funcionales

### NFR-000: Stack tecnológico

El proyecto debe usar:

- Backend: NestJS + TypeScript.
- Frontend: React + Vite + TypeScript.
- OCR: Tesseract OCR.
- Renderizado de imágenes: node-canvas.
- ORM y migraciones: Prisma.
- Pruebas backend: Jest.
- Pruebas frontend: Vitest + Testing Library.
- Server state frontend: TanStack Query.
- Repositorio GitHub: público.

### NFR-001: Arquitectura

El proyecto debe usar la arquitectura recomendada:

- Backend: Clean Architecture / Hexagonal Architecture.
- Frontend: estructura modular por features.
- Integraciones externas detrás de puertos/adaptadores.

### NFR-002: Infraestructura local

El proyecto debe usar Docker Compose como única estrategia de ejecución para `v0.1.0`.

El entorno local debe incluir backend, frontend, PostgreSQL, almacenamiento local de imágenes, proceso de depuración semanal, volumen persistente para PostgreSQL y volumen persistente para imágenes.

### NFR-003: Base de datos

El proyecto debe usar PostgreSQL local en Docker.

### NFR-004: Seguridad

La aplicación debe validar archivos subidos, metadatos y entradas externas.

La aplicación no debe hardcodear secretos.

La aplicación debe limitar tamaño, tipo MIME y extensión de imágenes subidas.

Las contraseñas deben almacenarse con hashing seguro y nunca en texto plano.

Las operaciones protegidas deben aplicar autorización por permisos y alcance por tienda.

### NFR-005: Observabilidad

Las operaciones backend deben usar logs estructurados para carga de archivos, OCR, resolución de cartas, llamadas a API, generación de imágenes y depuración de imágenes.

### NFR-006: Mantenibilidad

El código debe seguir SOLID, Clean Code y las reglas del `AGENTS.md` local del proyecto.

## 7. Criterios de aceptación

### AC-001: Carga de deck list

Dado que un operador sube una imagen válida de deck list y los metadatos obligatorios, cuando envía la carga, entonces el sistema almacena los metadatos y deja iniciada o preparada la extracción del deck.

### AC-002: Validación de metadatos obligatorios

Dado que un operador omite nombre del jugador, fecha del torneo, resultado del torneo o nombre del deck, cuando envía la carga, entonces el sistema rechaza la solicitud con errores de validación.

### AC-003: Extracción OCR del deck

Dada una imagen legible de deck list, cuando se ejecuta la extracción, entonces el sistema identifica entradas de Main Deck, Extra Deck y Side Deck con cantidades y nombres originales extraídos.

### AC-004: Corrección manual

Dado que una o más cartas extraídas no pueden resolverse con confianza, cuando el operador revisa la extracción, entonces el sistema permite la corrección manual antes de generar la imagen final.

### AC-005: Resolución de nombres en inglés

Dado que los nombres extraídos están en español o tienen errores de OCR, cuando se ejecuta la resolución, entonces el sistema los mapea a nombres en inglés o los marca como no resueltos.

### AC-006: Consulta a YGOPRODeck

Dado un nombre de carta resuelto en inglés, cuando el sistema consulta YGOPRODeck, entonces almacena el ID de carta, nombre oficial, tipo de carta y referencias de imagen devueltos por la API.

### AC-007: Caché de YGOPRODeck

Dado que la información de una carta ya existe en la base de datos/caché local, cuando esa misma carta se requiere de nuevo, entonces el sistema usa los datos cacheados antes de realizar una nueva solicitud a YGOPRODeck.

### AC-008: Caché de imágenes de cartas

Dada una URL de imagen de carta de YGOPRODeck, cuando la imagen se necesita por primera vez, entonces el sistema descarga y almacena una copia local persistente en el volumen de imágenes.

### AC-009: Contenido de imagen generada

Dado un deck validado y una configuración de branding, cuando se genera la imagen, entonces el resultado incluye Main Deck, Extra Deck, Side Deck, nombre del jugador, fecha del torneo, resultado del torneo, nombre del deck, logos, redes sociales y credito inferior/fuente del deck list.

### AC-010: Configuración de tienda, eventos, torneos y redes

Dado que un administrador de tienda configura logos, redes sociales, tipos de eventos o tipos de torneos, cuando se genera una nueva imagen de deck, entonces la imagen generada usa los valores configurados que correspondan.

### AC-011: Login y registro

Dado que un usuario registra credenciales válidas, cuando completa el registro, entonces el sistema crea el usuario local con contraseña hasheada.

### AC-012: Usuario root inicial

Dado que el sistema se inicializa por primera vez, cuando se ejecutan las migraciones o seed inicial, entonces el usuario `root` se crea como primer usuario con credenciales genéricas locales.

### AC-013: Cambio obligatorio de contraseña root

Dado que `root` inicia sesión por primera vez con credenciales genéricas, cuando el login es válido, entonces el sistema obliga a cambiar la contraseña antes de permitir cualquier otra operación.

### AC-014: Root global

Dado que `root` tiene todos los permisos, cuando consulta o administra información, entonces puede acceder a la información de todas las tiendas.

### AC-015: Roles y permisos

Dado que `root` configura roles y permisos, cuando asigna permisos a roles y roles a usuarios, entonces el sistema persiste esas relaciones y las aplica en operaciones protegidas.

### AC-016: Único root

Dado que ya existe el usuario `root`, cuando se intenta crear otro usuario `root`, entonces el sistema rechaza la operación.

### AC-017: Un administrador por tienda

Dado que una tienda ya tiene un `store_admin`, cuando `root` intenta asignar otro `store_admin` a la misma tienda, entonces el sistema rechaza la operación.

### AC-018: Operadores por tienda

Dado que una tienda ya tiene un `store_admin`, cuando `root` o `store_admin` crea operadores para esa tienda, entonces el sistema permite crear N operadores vinculados a esa tienda.

### AC-019: Autorización

Dado que un usuario intenta ejecutar una operación protegida sin permiso suficiente, cuando realiza la solicitud, entonces el sistema rechaza la operación.

### AC-020: Aislamiento por tienda

Dado que un usuario no-root pertenece a una tienda, cuando consulta decks, torneos, configuración, imágenes o usuarios, entonces el sistema solo devuelve información de su tienda vinculada.

### AC-021: Bloqueo de acceso entre tiendas

Dado que un usuario no-root de una tienda intenta acceder a información de otra tienda, cuando realiza la solicitud, entonces el sistema rechaza la operación.

### AC-022: Corrección previa a generación

Dado que un deck fue subido y OCR fue ejecutado, cuando la revisión no ha sido confirmada, entonces el sistema no permite generar la imagen final.

### AC-023: No reemplazar deck subido

Dado que un deck list ya fue subido para un registro de deck, cuando un usuario intenta reemplazarlo, entonces el sistema rechaza la operación.

### AC-024: Inactivación de deck por administrador

Dado que una imagen de deck ya fue generada, cuando un `store_admin` o `root` inactiva el deck, entonces el sistema aplica soft delete o estado inactivo y permite cargar un nuevo deck.

### AC-025: Bloqueo de eliminación por operador

Dado que un operador intenta eliminar o inactivar un deck ya generado, cuando realiza la operación, entonces el sistema rechaza la operación.

### AC-026: Fondo parametrizable

Dado que una tienda configura un fondo propio, cuando se genera una imagen, entonces la plantilla usa ese fondo.

### AC-027: Color de fondo parametrizable

Dado que una tienda no tiene fondo propio activo y configura un color de fondo, cuando se genera una imagen, entonces la plantilla usa ese color.

### AC-028: Generación sin internet con caché completa

Dado que no hay conexión a YGOPRODeck y todas las cartas e imágenes del deck están cacheadas localmente, cuando se genera la imagen, entonces la generación se completa usando caché local.

### AC-029: Bloqueo sin internet con caché incompleta

Dado que no hay conexión a YGOPRODeck y falta una carta o imagen del deck en caché local, cuando se intenta generar la imagen, entonces el sistema bloquea la generación e informa las cartas faltantes.

### AC-030: Imagen 1080x1350

Dado un deck validado y una configuración de branding, cuando se genera la imagen, entonces el archivo resultante mide `1080x1350` px.

### AC-031: Plantilla base parametrizable

Dado que existe la plantilla base de `v0.1.0`, cuando se genera una imagen, entonces los logos, redes sociales, credito inferior/fuente del deck list, datos del torneo, datos del jugador y deck se renderizan usando parámetros configurables.

Dado que se renderiza el encabezado de la imagen, cuando existen datos del torneo, ubicacion, resultado y duelista, entonces el encabezado debe construirse con esos datos y no con el credito inferior.

### AC-032: Persistencia

Dado que una imagen de deck fue generada, cuando el operador recarga el detalle del deck, entonces la información persistida del deck y los metadatos de la imagen generada están disponibles.

### AC-033: Depuración semanal segura

Dado que existen imágenes temporales con 7 o más días de antigüedad y assets permanentes, cuando se ejecuta la depuración semanal, entonces solo se eliminan imágenes de deck list subidas e imágenes generadas que cumplan la política de retención.

### AC-034: Protección de assets permanentes

Dado que existen imágenes de cartas, logos de tiendas, logos de eventos o logos/iconos de redes sociales, cuando se ejecuta la depuración semanal, entonces esos assets no se eliminan.

### AC-035: Ejecución local

Dado que el usuario ejecuta el entorno con Docker Compose, cuando los servicios inician correctamente, entonces la aplicación funciona localmente sin requerir despliegue a internet.

### AC-036: Cobertura de pruebas unitarias

Dado que se genera código productivo para un requisito, cuando se ejecutan las pruebas, entonces cada criterio de aceptación relacionado tiene al menos una ruta de prueba unitaria o de componente.

### AC-037: Navegación contextual por sesión y rol

Dado que un usuario no ha iniciado sesión, cuando abre la aplicación, entonces la navegación muestra solo `Login`.

Dado que el login devuelve `mustChangePassword = true`, cuando la sesión se establece, entonces la aplicación muestra inmediatamente el cambio de contraseña sin exponerlo como botón de navegación.

Dado que un usuario autenticado no es `root`, cuando ve la navegación, entonces no debe ver la opción `Registro`.

Dado que un usuario autenticado es `root` y ya cambió su contraseña, cuando ve la navegación, entonces puede acceder a `Registro`.

### AC-038: Index de eventos configurados por tienda

Dado que un usuario no-root inicia sesión, cuando llega al index de eventos, entonces solo ve eventos configurados de su tienda vinculada.

Dado que `root` inicia sesión, cuando llega al index de eventos, entonces ve eventos configurados de todas las tiendas.

Dado que un usuario autenticado ve el index de eventos, cuando se cargan los datos, entonces se muestra una estadística con la cantidad total de eventos visibles.

Dado que un `operator`, `store_admin` o `root` ve un evento, cuando usa la acción de modificación, entonces puede actualizar el evento según su alcance de tienda.

Dado que un `operator` ve un evento, cuando revisa sus acciones, entonces no debe tener opción de eliminación.

Dado que `store_admin` o `root` elimina un evento, cuando confirma la acción, entonces el evento se inactiva mediante soft delete y no se borra físicamente de base de datos.

### AC-039: Navegacion fija y selectores de datos relacionados

Dado que un usuario autenticado navega entre pantallas, cuando cambia al modulo de seguridad u otro modulo con mayor contenido vertical, entonces el menu lateral debe conservar su posicion visual sin desplazarse hacia abajo.

Dado que una pantalla solicita seleccionar tienda, logos, tipos de evento o tipos de torneo, cuando el usuario llena el formulario, entonces esos campos deben mostrarse como listas desplegables alimentadas por datos existentes en base de datos y no como campos de texto libre para IDs.

Dado que un usuario no-root consulta listas desplegables de tienda o assets, cuando el backend responde, entonces solo debe devolver datos de su tienda vinculada.

Dado que `root` consulta listas desplegables de tienda, cuando el backend responde, entonces puede recibir todas las tiendas existentes.

### AC-040: Creacion de tienda desde configuracion

Dado que `root` abre la configuracion de tienda y no existen tiendas creadas, cuando diligencia nombre de tienda y guarda, entonces el sistema crea la tienda sin exigir seleccionar una tienda previa.

Dado que `root` abre la configuracion de tienda y existen tiendas creadas, cuando desea crear otra tienda, entonces debe poder cambiar a modo de creacion sin digitar manualmente IDs.

Dado que un usuario no-root abre la configuracion de tienda, cuando no tiene una tienda vinculada, entonces el sistema debe bloquear la operacion; si tiene tienda vinculada, solo puede configurar su tienda.

Dado que el formulario muestra el campo de credito inferior/fuente del deck list, cuando el usuario lo edita, entonces debe quedar claro que no corresponde al encabezado principal de la imagen.

### AC-041: Permisos del volumen local de imagenes

Dado que el backend se ejecuta como usuario no-root dentro de Docker, cuando sube deck lists, logos, fondos o imagenes generadas, entonces el volumen local de imagenes debe permitir crear carpetas y archivos sin ejecutar el backend como root.

Dado que el volumen de imagenes ya existe con propietario incorrecto, cuando se levanta Docker Compose, entonces el entorno debe corregir la propiedad del volumen antes de iniciar backend e image-cleaner.

### AC-042: Alcance de tienda en carga multipart de deck

Dado que un usuario autenticado carga un deck list mediante `multipart/form-data`, cuando el formulario incluye `storeId`, entonces el backend debe validar el alcance de tienda despues de parsear el multipart y antes de persistir el deck.

Dado que un usuario intenta cargar un deck para una tienda fuera de su alcance, cuando envia la solicitud multipart, entonces el sistema debe rechazar la operacion sin crear el deck.

### AC-043: Alias de cartas en espanol y variantes OCR

Dado que el OCR devuelve nombres en espanol o variantes con errores comunes de lectura, cuando se ejecuta la resolucion de nombres, entonces el sistema debe intentar convertirlos a un nombre oficial en ingles antes de consultar cache local o YGOPRODeck.

Dado que un alias local coincide con una unica carta oficial, cuando se resuelve la carta, entonces debe quedar marcada como `RESOLVED` contra la carta oficial obtenida desde cache o YGOPRODeck.

Dado que no existe alias ni coincidencia confiable, cuando se resuelve la carta, entonces debe conservarse como `UNRESOLVED` para correccion manual.

### AC-044: OCR por regiones para plantilla KDE

Dada una imagen de deck list con la plantilla KDE de tres columnas superiores y dos columnas inferiores, cuando se ejecuta OCR, entonces el sistema debe leer regiones separadas para monstruos, magicas, trampas, extra deck y side deck, y debe entregar el texto con encabezados de seccion para mejorar el parseo.

Dado que el OCR por regiones no detecta texto util, cuando se ejecuta la extraccion, entonces el flujo conserva el comportamiento de marcar la extraccion como fallida y permitir correccion manual posterior.

## 8. Preguntas abiertas

No quedan preguntas funcionales abiertas para iniciar `v0.1.0`.
