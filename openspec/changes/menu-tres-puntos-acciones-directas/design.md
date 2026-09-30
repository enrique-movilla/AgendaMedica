# Design

## Context

`MenuTresPuntos` (`AgendaView.tsx:948`) solo recibe `onDetalle` y sus dos
opciones hacen lo mismo. `PanelDetalleCita` (`:1255`) ya implementa los
flujos completos: `ejecutarAccion` (`:1311`) con reprogramar (`PUT`
`modificarCita`), cancelar con motivo de catálogo obligatorio
(`cancelarCita`), y reglas de visibilidad por estado (`:1366-1417`:
reprogramar en 1/2/7, cancelar en 1/2/3/7). El menú solo existe en la
timeline diaria (`:902`). `NuevaCitaView` acepta `CitaHint` totalmente
editable (fecha, profesional, tipo, motivo) y valida paciente + traslape
al guardar. Ver propuesta (porqué) y `specs/menu-acciones-directas/spec.md`.

## Goals / Non-Goals

**Goals:**

- Reutilizar los flujos del panel sin duplicar validaciones ni llamadas.
- Duplicar sin endpoint nuevo, apoyado en el `POST` de creación existente.

**Non-Goals:**

- Llevar el menú a semanal/mensual/lista; sigue solo en diaria.
- Edición inline dentro del menú (forms en el desplegable).

## Decisions

### Decisión 1: el menú abre el detalle con acción prearmada

`MenuTresPuntos` recibe `onAccion(item, 'reprogramar'|'cancelar')` además
de `onDetalle`. El padre hace `setSel(item)` y `PanelDetalleCita` acepta
prop opcional `accionInicial` que el efecto de carga aplica en vez de
`null` (solo cuando cambia la cita). Alternativa descartada: formularios
inline en el menú — duplicaría validación de motivo, catálogo de motivos
y manejo de errores ya probados.

### Decisión 2: visibilidad por estado con las mismas reglas del panel

El menú muestra Reprogramar solo en estados 1/2/7 y Cancelar solo en
1/2/3/7 (mismas listas literales del panel). Alternativa descartada:
mostrar siempre y fallar al ejecutar — peor UX y más errores 409/422.

### Decisión 3: Duplicar = hint a Nueva asignación

`onDuplicar(item)` construye `CitaHint` con `fechaHora` origen,
`profesionalId`, `motivo` (=`motivoConsulta`) y `tipoCitaId` resuelto por
nombre contra `tiposCita` ya cargados (null si no hay match: el operador
lo elige). El paciente NO se precarga (`CitaHint` no lo soporta y
reutilizarlo sería riesgoso); el operador lo selecciona con el flujo
normal, que exige selección explícita. El guardado valida traslape como
siempre (409 si el operador conserva fecha/hora origen).

### Decisión 4: etiqueta `AccionDuplicar` por catálogo completo

Nueva clave de catálogo con el camino probado de la clave 49 (enum
`ClaveTermino` + seeds por vertical + registro frontend
`types.ts`/`CatalogoContext`/`constants.ts`/`IdentidadView` + seed en
Supabase tenant 1/default). Alternativa descartada: literal — rompería el
patrón multi-vertical donde todas las acciones son configurables.

## Risks / Trade-offs

- [`accionInicial` puede quedar obsoleta si el usuario abre otra cita sin
  cerrar el panel] → el efecto solo la aplica al cambiar `citaId`; dentro
  de la misma cita el estado local manda.
- [Seed de `AccionDuplicar` en Supabase] → solo inserta el faltante por
  tenant/vertical (patrón 49), no pisa personalizados; verificar con
  `GET /v1/catalogo/...` antes de desplegar.
