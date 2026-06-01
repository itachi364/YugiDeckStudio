# YugiDeckStudio v0.1.0 - Requisitos

## 1. Propósito

YugiDeckStudio es una aplicación web local con frontend y backend para visualización de decks de torneos de Yu-Gi-Oh!.

La aplicación permite que una tienda u organizador de torneos suba una imagen de deck list como evidencia, incluya un link público de Yu-Gi-Oh! Neuron para importar la lista estructurada de cartas, revise la composicion del deck, obtenga metadatos e imágenes desde YGOPRODeck usando los nombres revisados, persista la información resultante en PostgreSQL y genere una imagen compartible del deck similar a gráficos de Top Cut.

## 2. Alcance

La versión `v0.1.0` se enfoca en ejecución local únicamente.

Incluye:

- Subir una imagen de deck list como evidencia obligatoria.
- Incluir un link público de Yu-Gi-Oh! Neuron como fuente obligatoria de composición del deck.
- Capturar metadatos del jugador, torneo y deck.
- Extraer nombres y cantidades de cartas desde la página pública de Yu-Gi-Oh! Neuron.
- Revisar la composicion importada del deck sin un paso manual separado de resolucion de nombres.
- Buscar cartas en la API de YGOPRODeck.
- Persistir información de deck, cartas, jugador, torneo, configuración e imagen generada.
- Guardar imágenes en almacenamiento local administrado por Docker.
- Generar una imagen final del deck con branding y redes sociales configurables.
- Generar la imagen final en formato `1080x1350` px.
- Usar una plantilla base parametrizable para `v0.1.0`.
- Configurar tiendas, redes sociales, eventos y torneos.
- Cerrar torneos de forma manual o automatica segun los resultados Top Cut cargados.
- Registrar usuarios e iniciar sesión.
- Crear un único usuario `root` local inicial.
- Forzar cambio de contraseña de `root` en el primer inicio de sesión.
- Permitir que `root` configure el primer usuario administrador de tienda.
- Configurar tipos de usuario/roles y permisos.
- Soportar múltiples tiendas con aislamiento de información por tienda.
- Exigir revisión obligatoria de la lista importada desde Neuron antes de generar imágenes.
- Aplicar ciclo de vida de decks con corrección previa a generación y soft delete posterior.
- Ejecutar una depuración semanal de imágenes temporales.
- Usar node-canvas para renderizar imágenes del deck.

No incluye en `v0.1.0`:

- Despliegue a internet.
- Despliegue en Hostinger, AWS, Oracle Cloud u otro proveedor.
- Alta disponibilidad.
- CDN.
- Acceso público desde fuera de la máquina o red local donde se ejecute Docker.

El OCR queda fuera del alcance funcional desde esta regla de negocio. La imagen subida se conserva como evidencia/auditoría, pero no se usa para extraer la composición del deck. La fuente soportada para composición de deck en `v0.1.0` será el link público de Yu-Gi-Oh! Neuron, que redirige a la base de datos pública de Konami y permite obtener una lista estructurada por HTML.

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

### REQ-001: Subir imagen de deck list y link Neuron

La aplicación debe permitir que un operador suba una imagen de deck list como evidencia y debe exigir un link público de Yu-Gi-Oh! Neuron para obtener la composición del deck.

Metadatos obligatorios durante la carga:

- Link público de Yu-Gi-Oh! Neuron.
- Nombre del jugador.
- Fecha del torneo.
- Resultado del torneo usando una de las opciones permitidas: `Ganador`, `Segundo Puesto`, `Top 3 - 4` o `Top 8`.
- Nombre del deck usado.

Metadatos opcionales:

- Nombre del torneo.
- Tipo de torneo configurado.
- Tipo de evento configurado.
- Nombre de tienda u organizador.
- Ciudad o ubicación del evento.

### REQ-002: Importar deck list desde Yu-Gi-Oh! Neuron

La aplicación debe consultar el link público de Yu-Gi-Oh! Neuron indicado durante la carga y extraer cantidades, nombres de cartas y secciones: Main Deck, Extra Deck y Side Deck.

La aplicación debe seguir redirecciones válidas desde `https://neuron.konami.net/link/...` hacia `https://www.db.yugioh-card.com/yugiohdb/member_deck.action...`.

La aplicación debe rechazar links que no pertenezcan a dominios Konami permitidos o que no devuelvan una lista de deck parseable.

La aplicación debe conservar el link Neuron asociado al deck para auditoría.

### REQ-003: Revisar composicion del deck

La aplicación debe conservar los nombres oficiales importados desde Neuron y permitir que el usuario revise la composicion del deck antes de confirmarlo.

La aplicación debe permitir agregar cartas faltantes, eliminar cartas que no pertenezcan al deck y corregir seccion, cantidad, nombre y orden antes de confirmar el deck.

La aplicación no debe exponer al usuario un paso separado de resolucion de nombres. Cuando se cacheen imagenes, el backend debe usar los nombres revisados como entrada para consultar YGOPRODeck y obtener metadatos e imagenes.

### REQ-004: Obtener información de cartas desde YGOPRODeck

La aplicación debe consultar YGOPRODeck para obtener metadatos e imágenes de cartas.

La aplicación debe usar datos cacheados cuando estén disponibles antes de realizar solicitudes externas.

La aplicación debe evitar exceder los límites de solicitudes de YGOPRODeck.

### REQ-005: Cachear imágenes de cartas

La aplicación debe descargar y almacenar imágenes de cartas en almacenamiento local persistente administrado por Docker, en lugar de usar imágenes de YGOPRODeck como hotlinks permanentes.

Las imágenes cacheadas de cartas se consideran assets permanentes y no deben ser eliminadas por el proceso semanal de depuración.

### REQ-006: Persistir información del deck

La aplicación debe persistir metadatos de deck list subida, jugador, torneo, deck, secciones, cantidades, cartas revisadas, imagen generada y configuración de tienda.

### REQ-007: Generar imagen del deck

La aplicación debe generar una imagen compartible similar a la referencia visual suministrada.

La imagen generada debe incluir Main Deck, Extra Deck, Side Deck, nombre del jugador, fecha del torneo, resultado, nombre del deck, evento o torneo cuando aplique, logos, redes sociales y credito inferior/fuente del deck list.

### REQ-008: Configurar tienda, eventos, torneos y redes sociales

La aplicación debe permitir configurar datos de tienda, logos, eventos, torneos, redes sociales, logos/iconos de redes sociales, credito inferior/fuente del deck list, fondo propio y color de fondo.

Los logos de tiendas, logos de eventos, logos de torneos y logos/iconos de redes sociales se consideran assets permanentes y no deben ser eliminados por el proceso semanal de depuración.

Los eventos son variedades o categorias activas de una tienda. Un evento puede tener muchos torneos. Un torneo pertenece a un solo evento y es la entidad operativa que puede cerrarse.

Cada torneo debe permitir configurar nombre, descripcion opcional, evento asociado, logo opcional y estado `OPEN` o `CLOSED`.

La ventana de catalogos debe listar primero los eventos de la tienda seleccionada. La creacion de torneos debe iniciarse desde un evento listado mediante un modal con el evento ya seleccionado.

La creacion de eventos, torneos y redes sociales debe cargar el logo directamente desde el formulario operativo. No debe requerir seleccionar un logo previamente cargado desde una lista.

La configuracion de redes sociales pertenece a la ventana de configuracion de tienda. Cada tienda debe tener una accion `Crear redes sociales` que abra un modal para diligenciar una o varias redes al tiempo y enviar el `storeId` de la tienda seleccionada.

### REQ-008A: Cierre de torneo

La aplicación debe cerrar automaticamente un torneo cuando existan ocho decks cargados para ese torneo con esta distribucion exacta de resultados:

- 1 `Ganador`.
- 1 `Segundo Puesto`.
- 2 `Top 3 - 4`.
- 4 `Top 8`.

La aplicación debe permitir cierre manual de torneo cuando exista al menos un deck con resultado `Ganador`.

Un torneo cerrado no debe permitir nuevas cargas de decks.

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
- `operator`: subir deck lists, revisar importacion, corregir cartas antes de generación, generar imágenes y descargar imágenes de su tienda.

### REQ-011: Previsualizar y descargar

La aplicación debe permitir previsualizar y descargar la imagen generada desde el entorno local cuando el usuario tenga permisos.

### REQ-012: Ciclo de vida de decks

Una vez subido un deck, no debe permitirse recargar o reemplazar el deck list sobre el mismo registro.

Antes de generar la imagen final, el operador debe poder revisar y corregir la lista importada desde Neuron.

La revisión de la importación Neuron debe ser obligatoria antes de generar la imagen.

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

Los formularios que envían contraseñas no deben enviar esos valores en texto plano dentro del payload JSON visible de la solicitud. El frontend debe cifrar el cuerpo sensible antes de enviarlo y el backend debe descifrarlo en la capa HTTP antes de ejecutar los casos de uso.

Las operaciones protegidas deben aplicar autorización por permisos y alcance por tienda.

### NFR-005: Observabilidad

Las operaciones backend deben usar logs estructurados para carga de archivos, importación Neuron, revision de deck, llamadas a API, generación de imágenes y depuración de imágenes.

### NFR-006: Mantenibilidad

El código debe seguir SOLID, Clean Code y las reglas del `AGENTS.md` local del proyecto.

## 7. Criterios de aceptación

### AC-001: Carga de deck list

Dado que un operador sube una imagen válida de deck list, incluye un link público válido de Neuron y los metadatos obligatorios, cuando envía la carga, entonces el sistema almacena los metadatos, conserva la imagen como evidencia e importa la composición del deck desde Neuron.

### AC-002: Validación de metadatos obligatorios

Dado que un operador omite link Neuron, nombre del jugador, torneo abierto, resultado del torneo o nombre del deck, cuando envía la carga, entonces el sistema rechaza la solicitud con errores de validación.

### AC-003: Importación Neuron del deck

Dado un link público válido de Yu-Gi-Oh! Neuron, cuando se carga el deck, entonces el sistema identifica entradas de Main Deck, Extra Deck y Side Deck con cantidades y nombres oficiales importados.

### AC-004: Corrección manual

Dado que una o más cartas importadas requieren ajuste, cuando el operador revisa la lista, entonces el sistema permite la corrección manual antes de generar la imagen final.

### AC-005: Revisión de deck sin resolución manual

Dado que los nombres importados desde Neuron son la fuente confiable del deck, cuando el usuario revisa la composicion, entonces puede confirmar el deck sin ejecutar un paso separado de resolucion de nombres.

Dado que el usuario detecta una carta faltante o incorrecta, cuando revisa el deck, entonces puede agregarla, editarla o eliminarla antes de confirmar.

### AC-006: Consulta a YGOPRODeck

Dado un nombre de carta resuelto en inglés, cuando el sistema consulta YGOPRODeck, entonces almacena el ID de carta, nombre oficial, tipo de carta y referencias de imagen devueltos por la API.

### AC-007: Caché de YGOPRODeck

Dado que la información de una carta ya existe en la base de datos/caché local, cuando esa misma carta se requiere de nuevo, entonces el sistema usa los datos cacheados antes de realizar una nueva solicitud a YGOPRODeck.

### AC-008: Caché de imágenes de cartas

Dada una URL de imagen de carta de YGOPRODeck, cuando la imagen se necesita por primera vez, entonces el sistema descarga y almacena una copia local persistente en el volumen de imágenes.

### AC-009: Contenido de imagen generada

Dado un deck validado y una configuración de branding, cuando se genera la imagen, entonces el resultado incluye Main Deck, Extra Deck, Side Deck, nombre del jugador, fecha del torneo, resultado del torneo, nombre del deck, logos, redes sociales y credito inferior/fuente del deck list.

Dado un deck validado con cantidades legales, cuando se genera la imagen, entonces todas las cartas expandidas por cantidad deben renderizarse en su sección correspondiente sin truncarse.

### AC-010: Configuración de tienda, eventos, torneos y redes

Dado que un administrador de tienda configura logos, redes sociales, eventos o torneos, cuando se genera una nueva imagen de deck, entonces la imagen generada usa los valores configurados que correspondan.

Dado que un administrador configura un torneo, cuando carga un logo de torneo, entonces el logo se almacena como asset permanente y puede asociarse al torneo.

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

Dado que un deck fue subido e importado desde Neuron, cuando la revisión no ha sido confirmada, entonces el sistema no permite generar la imagen final.

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

Dado que una pantalla solicita seleccionar tienda, logos, eventos o torneos, cuando el usuario llena el formulario, entonces esos campos deben mostrarse como listas desplegables alimentadas por datos existentes en base de datos y no como campos de texto libre para IDs.

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

### AC-043: Link Neuron obligatorio y seguro

Dado que un operador carga un deck sin link Neuron, cuando envía el formulario, entonces el frontend y backend bloquean la carga e indican que el link es obligatorio.

Dado que un operador informa un link fuera de los dominios Konami permitidos, cuando el backend valida la carga, entonces rechaza la solicitud sin crear el deck.

Dado que el link Neuron devuelve HTML sin una lista de deck parseable, cuando el backend intenta importar el deck, entonces rechaza la solicitud sin crear un deck incompleto.

### AC-044: Importación estructurada desde Neuron

Dado que Konami publica el deck en HTML estructurado, cuando el backend importa el deck, entonces debe leer filas de Main Deck, Extra Deck y Side Deck usando cantidades y nombres oficiales.

Dado que el HTML de Konami incluye cantidades con saltos de línea o entidades HTML, cuando se parsea la lista, entonces el sistema normaliza esos valores y conserva las cantidades correctas.

### AC-045: Flujo seguro de revisión de importación en frontend

Dado que el usuario revisa las cartas importadas, cuando detecta registros incorrectos, entonces debe poder eliminar registros individuales antes de guardar correcciones.

Dado que existen cambios locales sin guardar en las cartas importadas, cuando el usuario revisa la pantalla, entonces la accion `Confirmar deck` debe permanecer deshabilitada hasta guardar los cambios.

Dado que el usuario acaba de cargar un deck o consulta la tabla de decks cargados, cuando selecciona `Revisar deck`, entonces la aplicacion debe abrir directamente la revision de ese deck sin exigir digitar manualmente el Deck ID.

Dado que un usuario autenticado abre la ventana de carga de decks, cuando consulta los decks cargados, entonces ve una tabla de decks visibles segun su alcance de tienda.

### AC-046: Revision completa antes de confirmar o generar imagen

Dado que el importador Neuron obtiene cartas, cuando el usuario revisa la lista editable, entonces debe mostrar conteos por `Main Deck`, `Extra Deck` y `Side Deck`, calculados por suma de cantidades.

Dado que faltan cartas para una composicion valida de deck, cuando el usuario intenta confirmar revision, entonces el sistema debe bloquear la confirmacion e indicar que `Main Deck` debe tener entre 40 y 60 cartas, `Extra Deck` maximo 15 y `Side Deck` maximo 15.

Dado que la importación Neuron requiere ajuste manual, cuando el usuario corrige el deck, entonces debe poder agregar filas manualmente antes de guardar correcciones y resolver nombres.

Dado que un deck incompleto ya tiene revision confirmada por datos historicos o por error, cuando se intenta generar imagen, entonces el backend debe bloquear la generacion por composicion invalida.

### AC-047: Listado de decks por alcance de tienda

Dado que un usuario no-root abre la ventana de carga de decks, cuando el frontend consulta los decks cargados, entonces solo se muestran decks de su tienda vinculada.

Dado que `root` abre la ventana de carga de decks, cuando el frontend consulta los decks cargados, entonces se muestran decks de todas las tiendas.

### AC-048: Revisión directa desde carga y listado

Dado que un deck se carga correctamente, cuando se muestra el resultado de carga, entonces existe una accion `Revisar deck` que abre la revision de ese deck.

Dado que la ventana de carga lista decks existentes, cuando el usuario selecciona la accion `Revisar`, entonces se abre la revision del deck seleccionado.

Dado que la revision se abre desde la carga o el listado, cuando el usuario navega la aplicacion, entonces no existe un menu lateral separado de revision.

### AC-049: Generacion directa desde listado de decks

Dado que un deck tiene revision confirmada, cuando el usuario consulta la pantalla `Decks`, entonces puede seleccionar `Generar imagen` desde la fila del deck sin abrir un menu separado de imagen.

Dado que el usuario selecciona `Generar imagen`, cuando el backend cachea cartas y no hay faltantes, entonces la aplicacion genera, previsualiza y permite descargar el PNG desde la misma pantalla `Decks`.

Dado que faltan cartas o imagenes durante el cacheo, cuando el usuario intenta generar la imagen, entonces la pantalla `Decks` muestra las dependencias faltantes y no ejecuta la generacion final.

Dado que un deck ya tiene `reviewStatus = CONFIRMED`, cuando se muestra en la tabla de `Decks`, entonces la accion `Revisar` debe estar deshabilitada.

### AC-050: Layout responsive de aplicacion

Dado que el usuario abre la aplicacion en navegador de escritorio, cuando navega cualquier modulo, entonces la vista usa el ancho disponible del navegador sin limitar el workspace principal a una columna estrecha.

Dado que el usuario abre la aplicacion en celular, cuando navega formularios, listados, revision de deck o previsualizacion de imagen, entonces los controles y filas se adaptan a una sola columna sin desbordar horizontalmente.

### AC-051: Revision y generacion en modales desktop

Dado que el usuario abre la aplicacion en navegador de escritorio, cuando selecciona `Revisar` desde la tabla de decks, entonces la revision del deck se abre en un modal sin salir de la pantalla `Decks`.

Dado que el usuario abre la aplicacion en navegador de escritorio, cuando selecciona `Generar imagen` desde un deck confirmado, entonces el cacheo, generacion, previsualizacion y descarga se muestran en un modal sin usar un menu lateral separado.

### AC-052: Revision y generacion en mobile sin perder sesion

Dado que el usuario abre la aplicacion en celular, cuando selecciona `Revisar` o `Generar imagen`, entonces la aplicacion abre una vista interna completa adaptada al ancho del dispositivo en lugar de usar un modal.

Dado que la vista mobile cambia entre `Decks`, revision y generacion, cuando el usuario navega o refresca el navegador, entonces la sesion autenticada debe conservarse mientras no supere el tiempo de inactividad permitido.

### AC-053: Sesion local con inactividad de 20 minutos

Dado que un usuario autenticado refresca la aplicacion con F5, cuando la ultima actividad registrada fue hace menos de 20 minutos, entonces el frontend restaura la sesion y no exige login nuevamente.

Dado que un usuario autenticado no realiza actividad durante 20 minutos o mas, cuando el frontend evalua la sesion local, entonces cierra la sesion, elimina el token almacenado localmente y vuelve al login.

Dado que un usuario cierra sesion manualmente en una pestana, cuando hay otra pestana de la aplicacion abierta, entonces la otra pestana debe limpiar la sesion local y regresar al login.

### AC-054: Torneos asociados a eventos

Dado que una tienda tiene eventos configurados, cuando se crea o modifica un torneo, entonces el usuario debe seleccionar el evento al que pertenece el torneo.

Dado que un usuario consulta el index autenticado, cuando se listan torneos, entonces cada fila debe mostrar el nombre del torneo como dato principal y el evento asociado como dato secundario.

Dado que un evento esta activo, cuando se crean varios torneos para ese evento, entonces el sistema permite la relacion uno-a-muchos entre evento y torneos.

### AC-055: Resultado de deck controlado

Dado que un usuario carga un deck, cuando selecciona el resultado, entonces el frontend debe mostrar una lista desplegable con `Ganador`, `Segundo Puesto`, `Top 3 - 4` y `Top 8`.

Dado que una solicitud de carga envia un resultado fuera de las opciones permitidas, cuando el backend valida la carga, entonces debe rechazarla con error de validacion.

### AC-056: Cierre manual y automatico de torneo

Dado que un torneo tiene al menos un deck con resultado `Ganador`, cuando el usuario ejecuta `Cerrar torneo`, entonces el backend cambia el torneo a `CLOSED`.

Dado que un torneo tiene exactamente 1 `Ganador`, 1 `Segundo Puesto`, 2 `Top 3 - 4` y 4 `Top 8`, cuando se carga el octavo deck que completa la distribucion, entonces el backend cierra automaticamente el torneo.

Dado que un torneo esta `CLOSED`, cuando un usuario intenta cargar otro deck en ese torneo, entonces el backend rechaza la carga y el frontend no debe ofrecerlo como opcion abierta de carga.

### AC-057: Logo de torneo en imagen generada

Dado que un torneo tiene logo activo configurado, cuando se genera la imagen del deck, entonces el logo del torneo debe renderizarse en la parte superior derecha de la imagen.

Dado que el torneo no tiene logo configurado, cuando se genera la imagen del deck, entonces la imagen conserva el comportamiento de logos disponible sin fallar.

### AC-058: Catalogos con torneos en modal por evento

Dado que un administrador consulta los catalogos de una tienda, cuando existen eventos configurados, entonces la pantalla lista los eventos en una tabla con accion `Crear torneo` por evento.

Dado que el administrador selecciona `Crear torneo` en un evento, cuando se abre el formulario, entonces se muestra en modal y el torneo queda asociado al evento seleccionado sin exigir elegir otro evento.

Dado que el administrador crea un evento o torneo con archivo de logo, cuando guarda el formulario, entonces el frontend sube el archivo como asset permanente de la categoria correspondiente y envia el `logoAssetId` resultante al backend.

### AC-059: Redes sociales por tienda en modal

Dado que un administrador consulta o crea una tienda, cuando la tienda tiene `storeId`, entonces la ventana de configuracion de tienda muestra la accion `Crear redes sociales`.

Dado que el administrador abre `Crear redes sociales`, cuando diligencia una o muchas redes y guarda, entonces el frontend sube el logo de cada red como `SOCIAL_LOGO` y envia la lista al endpoint `/api/stores/{storeId}/social-links`.

Dado que una red social tiene logo cargado desde su fila del formulario, cuando se guarda la lista, entonces el backend conserva `iconAssetId` asociado a la tienda indicada y no permite asociar iconos de otra tienda.

### AC-060: Ubicacion de logos en imagen generada

Dado que el evento del torneo tiene logo activo, cuando se genera la imagen del deck, entonces el logo del evento se renderiza en la parte inferior derecha.

Dado que la tienda tiene redes sociales activas con iconos, cuando se genera la imagen del deck, entonces los iconos y handles de redes sociales se renderizan en la parte inferior izquierda.

### AC-061: Payload cifrado para credenciales

Dado que el usuario inicia sesion, registra un operador, cambia contrasena o crea un administrador de tienda, cuando el frontend envia la solicitud al backend, entonces el payload HTTP no debe contener `password`, `currentPassword` ni `newPassword` en texto plano.

Dado que el backend recibe un sobre cifrado de autenticacion, cuando la llave es valida y el contenido no fue alterado, entonces descifra el JSON y ejecuta el caso de uso existente sin almacenar contrasenas en texto plano.

Dado que el backend recibe un sobre cifrado con llave vencida, llave incorrecta o contenido alterado, cuando intenta descifrarlo, entonces rechaza la solicitud con error de validacion sin ejecutar el caso de uso.

## 8. Preguntas abiertas

No quedan preguntas funcionales abiertas para iniciar `v0.1.0`.
