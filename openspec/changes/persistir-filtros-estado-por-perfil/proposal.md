## Why

Los chips de filtro por estado de `AgendaView` funcionan en memoria pero se
pierden al recargar o al cambiar de perfil simulado (`u1`/`u2`), obligando al
operador a reconfigurarlos cada vez. La selección de recursos (`profIds`) ya
persiste por perfil; los filtros deben comportarse igual.

## What Changes

- `estadosActivos` se inicializa desde el ambiente del perfil activo y se
  guarda en `localStorage` ante cada cambio (mismo patrón que `profIds`).
- Nueva clave de ambiente `estados` en `lib/perfil.ts`
  (`agenda:{u1|u2}:recursos:estados`); la clave heredada sin perfil, si
  existe, migra al Usuario 1.
- Si el perfil no tiene nada guardado, el valor inicial sigue siendo "todos
  los estados" (sin cambio de comportamiento por defecto).
- El filtrado de items pasa a aplicarse en memoria sobre lo ya cargado, sin
  refetch al alternar un estado (el fetch solo depende de
  perfil/recursos/rango/refresh).

## Capabilities

### New Capabilities

- `filtros-estado`: filtrado de la agenda por estado de cita con
  persistencia por perfil de operador.

### Modified Capabilities

(none — no hay specs previas; es el primer capability del proyecto)

## Impact

- Solo frontend: `frontend/src/views/AgendaView.tsx`
  (`estadosActivos`, efecto de carga de `agendaRango`) y
  `frontend/src/lib/perfil.ts` (nueva clave `estados` + migración legado).
- Sin cambios de backend, BD, API ni catálogos. Sin textos nuevos
  (reusa `LabelEstados`, `BtnTodos` y claves de `ESTADOS_CITA`).
- Al llegar autenticación real (Fase 5/6), la clave por perfil simulado se
  reemplaza junto con el resto de `perfil.ts`, sin migrar datos.
