# ADR-001: Usar Clean/Hexagonal Architecture con Docker y PostgreSQL

## Estado

Propuesto

## Contexto

YugiDeckStudio necesita integrarse con Yu-Gi-Oh! Neuron/Konami, YGOPRODeck, almacenamiento de imágenes, renderizado de imágenes y persistencia en PostgreSQL.

El proyecto también necesita frontend y backend que puedan evolucionar de forma independiente, manteniendo los flujos de negocio testeables.

## Decisión

Usar:

- Clean Architecture / Hexagonal Architecture para backend.
- Arquitectura frontend modular basada en features.
- PostgreSQL para persistencia.
- Docker para desarrollo local y empaquetado de despliegue.

Las dependencias externas se implementarán como adaptadores detrás de puertos:

- Yu-Gi-Oh! Neuron/Konami.
- YGOPRODeck.
- Almacenamiento de archivos/imágenes.
- Renderizado de imágenes.
- Repositorios PostgreSQL.

## Alternativas consideradas

### MVC por capas

Más simple para iniciar, pero puede acoplar demasiado controladores, APIs externas y persistencia para este flujo.

### Microservicios

No se justifica para `v0.1.0`; agregaría complejidad operativa antes de estabilizar el dominio.

### Serverless

Puede ser útil más adelante para generación de imágenes o jobs en background, pero el usuario seleccionó Docker para esta versión.

## Consecuencias

Positivas:

- Los flujos de negocio se mantienen testeables.
- Los sistemas externos se pueden mockear en pruebas unitarias.
- La persistencia PostgreSQL queda aislada de la lógica de dominio.

Negativas:

- Requiere más estructura inicial que una aplicación MVC simple.
- Requiere disciplina para evitar abstracciones innecesarias.

## Confirmación

El destino de almacenamiento para imágenes subidas y generadas será un volumen Docker local con metadatos persistidos en PostgreSQL.
