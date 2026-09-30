# Proposal

## Why

El menú de 3 puntos de cada bloque de la timeline diaria hoy solo abre el
detalle (sus dos opciones hacen lo mismo), obligando al operador a dos
clics y a ubicar la acción dentro del panel para reprogramar o cancelar.
Es el último hueco de Fase 2 (F2-8) y cierra la fase.

## What Changes

- El menú de 3 puntos ofrece acciones directas por cita: **Reprogramar**,
  **Duplicar** y **Cancelar**, además de **Ver detalle**.
- Reprogramar y Cancelar ejecutan el mismo flujo y validaciones que el
  panel detalle (mismo `PUT` reprogramación, mismo motivo obligatorio de
  catálogo `MotivoCancelacion`), sin pasar por el detalle primero.
- Duplicar abre Nueva asignación con profesional, tipo y motivo
  precargados desde la cita origen (sin endpoint nuevo; es un `POST`
  normal de creación).
- Las acciones se muestran solo cuando el estado de la cita las permite
  (mismas reglas del panel: reprogramar en 1/2/7, cancelar en 1/2/3/7).
- Alcance: timeline **diaria** (única vista donde el menú existe hoy).
  Semanal/mensual/lista quedan fuera.
- Etiqueta nueva `AccionDuplicar` en el catálogo (sigue el camino probado
  de la clave 49: enum + seeds + registro frontend + seed en Supabase).

## Capabilities

### New Capabilities

- `menu-acciones-directas`: acciones directas del menú contextual de 3
  puntos por bloque de cita (reprogramar, duplicar, cancelar).

### Modified Capabilities

(none — no hay spec previa de este comportamiento)

## Impact

- Solo frontend: `MenuTresPuntos` y `PanelDetalleCita` en
  `frontend/src/views/AgendaView.tsx` (reutilización de
  `ejecutarAccion`/`api`), más etiqueta `AccionDuplicar`
  (`types.ts`, `CatalogoContext`, `constants.ts`, `IdentidadView`).
- Backend: enum `ClaveTermino` + seeds por vertical (sin endpoints nuevos,
  sin cambios de BD salvo el término sembrado en Supabase).
- Sin cambios en `filtros-estado` ni en otras vistas.
