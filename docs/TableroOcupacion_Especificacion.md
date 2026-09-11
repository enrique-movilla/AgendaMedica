# Especificación — Tablero de ocupación del día (a demanda)

Fecha: 2026-09-10. Estado: especificación previa a implementación (no codificar aún).

## 1. Objetivo
Vista general de ocupación (qué está libre/ocupado por recurso y hora) que
sirva a todos los verticales solo con cambiar la Identidad de la Aplicación
(médicos, canchas, sillas/mesas, lavadero). **Principio inviolable: nunca
carga "todo" al abrir**; siempre es explícita y filtrada.

## 2. Entrada y carga diferida
- Ítem de menú "Tablero del día" (nueva vista `TableroView`, cargada con
  `React.lazy` para no engordar el bundle del operador).
- Al entrar muestra solo filtros + botón **Mostrar** (no dispara consultas).
- Opcional futuro: landing por perfil.

## 3. Filtros (todos con valor por defecto sensato)
| Filtro | Defecto | Origen de datos |
|---|---|---|
| Fecha | hoy | input date |
| Sede | todas | `GET /v1/catalogo/sedes` |
| Categoría (especialidad) | todas | `GET /v1/catalogo/especialidades` |
| Recurso | (vacío = los de la sede/categoría) | `GET /v1/profesionales?especialidad_id&sedeId` |
| Estado | todos (libres/ocupados) | `ESTADOS_CITA` local |
| Franja | 06:00–20:00 | inputs hora |
- Acción **Mostrar** (y **Limpiar**). Sin filtros válidos no consulta.
- Tope: 31 días de rango y 20 recursos por página (paginación simple 1..N).

## 4. Vista: matriz recursos × horas
- Filas = recursos (nombre + sede/consultorio), columnas = horas de la franja.
- Celda ocupada: color del estado (`colorEstado`/`estadoBadge` existentes) con
  hora + cliente; celda libre: contorno punteado con `+` (como la timeline).
- PC: matriz completa con scroll horizontal. Tablet: igual con scroll táctil.
  Celular: lista compacta agrupada por recurso (una tarjeta por recurso con
  sus bloques del día) en vez de matriz.
- Paginador de recursos (15–20 por página) + contador "mostrando X de Y".

## 5. Origen de cada dato
- Filas: `GET /v1/profesionales` (filtrado por sede/especialidad en backend).
- Ocupación: `GET /v1/citas/agenda-rango?profesionalesIds=&fechaDesde=&fechaHasta=`
  (solo IDs de la página visible).
- Huecos libres: `GET /v1/citas/disponibilidad?profesionalId&fecha&tipoCitaId`
  por recurso visible (igual que la timeline diaria actual).
- Textos y etiquetas: catálogo del tenant (`t()`); sin literales nuevos salvo
  fallbacks.

## 6. Interacción por celda (FASE 2 del tablero, no en la primera versión)
Cada celda ocupada/libre es clicable y abre el mismo detalle/acciones de cita
que la agenda (reusar `PanelDetalleCita` y modales existentes):
- Ocupada: ver detalle + **Confirmar, Iniciar atención, Reprogramar,
  Cancelar con motivo** (mismo flujo y validaciones que hoy).
- Libre: atajo a Nueva asignación con hint (fecha/hora + recurso).
Se anota aquí para no olvidarlo; se implementa después de validar la matriz
de solo lectura.

## 7. Rendimiento
- Consultas solo al pulsar Mostrar o cambiar página/filtros (debounce en
  búsqueda de recurso si la hubiera).
- `agenda-rango` una sola llamada con los IDs visibles; disponibilidad en
  paralelo por recurso visible (como hoy).
- Sin realtime en v1 (botón Actualizar manual).

## 8. Configuración por tenant (futuro, no v1)
Layout/tablero como JSON versionado por tenant (densidad, franja por defecto,
recursos por página). v1 con constantes; el configurador vendrá después.

## 9. Criterios de aceptación v1 (solo lectura)
1. Entrar al tablero no dispara ninguna llamada a citas/disponibilidad.
2. Con filtros por defecto + Mostrar: matriz del día con ≤20 recursos.
3. Cambiar de página solo recarga esas filas.
4. Celular muestra tarjetas por recurso, legibles sin zoom.
5. Cambiar la vertical (Identidad) re-etiqueta la vista sin código nuevo.
