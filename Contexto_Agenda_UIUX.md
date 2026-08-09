# Contexto de trabajo — Agenda Médica (UI/UX)

> **Branch de trabajo:** `feature/ui-ux`
> **Doc de referencia:** `docs/PreContexto_Agenda_UIUX.md`
> **Fecha del análisis:** agosto 2026
>
> Este archivo es el contexto consolidado para implementar las pantallas de la
> agenda médica: **Asignación (crear), Revisión (consultar/filtrar) y
> Mantenimiento (editar/cancelar)**. Úsalo como checklist y hoja de ruta.

---

## 1. Estado actual del código (lo que ya existe)

### Backend (maquinaria de citas sólida — `.NET 8 + CQRS + EF Core 8/Npgsql`)
- Endpoints en `AgendaMedica.Api/Controllers/CitasController.cs`:
  - `GET /v1/citas/{id}`, `POST /v1/citas`, `PUT /v1/citas/{id}` (reprogramar), `PATCH /v1/citas/{id}/estado`, `POST /v1/citas/{id}/cancelar`, `GET /v1/citas/{id}/historial`, `GET /v1/citas/agenda-dia`, `GET /v1/citas/disponibilidad`.
- `Cita` (`Domain/Entities/Cita.cs`): máquina de estados completa (`Confirmar`, `IniciarAtencion`, `MarcarRealizada`, `Cancelar`, `Reprogramar`, `MarcarNoAsistio`), valida fecha futura, y crea **Historial + Outbox en la misma transacción**.
- Validación de traslape por `ProfesionalId` en `Repositories/Repositorios.cs:97-112` (`ConflictoHorarioException` → 409 `HORARIO_OCUPADO`). **No atómica** (check-then-insert).
- Historial de estado inmutable (`HistorialEstadoCita`), pero **solo audita cambios de estado**, no fecha/hora/datos.
- Jobs: `OutboxProcessor` (sincroniza con Graph/Teams cada 15 s) y `RecordatorioProcessor` (recordatorios 1 h antes).
- Notificaciones por email/WhatsApp/SMS con canales placeholder.
- BD PostgreSQL (Supabase): columnas `FechaHora`/`FechaHoraFin` (sin `tsrange`), índices `IX_Cita_Profesional_Fecha`, `IX_Cita_Estado_Fecha`.

### Frontend (`frontend/src/App.tsx` — sin router, 4 vistas por estado interno)
- **AgendaView**: solo **tabla HTML plana** del día (columna: hora, paciente, iden., edad, tipo, estado, aseguradora, régimen, motivo). No es calendario.
- **NuevaCitaView**: formulario de creación básico.
- **PacientesView** y **CatalogosView/AdminCatalogoView**: CRUD.
- Dependencias: **solo React + Tailwind**. Sin fullcalendar/RBC/react-query/shadcn/dnd.

---

## 2. GAP — lo que NO existe aún (derivado del documento)

| # | Requisito del documento | Estado | Impacto |
|---|------------------------|--------|---------|
| G1 | Vista de calendario / cronograma | ❌ tabla plana | Alta — núcleo de la agenda |
| G2 | Timeline multi-recurso (varios médicos en paralelo) | ❌ | Alta — el doc la pide explícitamente |
| G3 | Pestañas diario / semanal / mensual / lista | ❌ | Alta |
| G4 | Disponibilidad real + plantillas horarias por profesional | ❌ endpoint devuelve solo ocupados | Alta — base del agendamiento |
| G5 | Filtros por estado (ocultar completados/pendientes/cancelados) | ❌ filtros fijos en backend | Media |
| G6 | Panel lateral de detalle + historial en UI | ❌ (¡backend `/historial` ya existe!) | Media-Alta |
| G7 | Drag & drop para reprogramar | ❌ | Media |
| G8 | Menú contextual 3 puntos (Reprogramar/Duplicar/Cancelar) | ❌ | Media |
| G9 | Bloqueo preventivo de turno 5 min (concurrencia) | ❌ | Alta — carrera de condiciones |
| G10 | Filtro entidades cruzadas (Profesional/Sede/Especialidad/Seguro) | Parcial (form extendido) | Media |
| G11 | Buscador "próximo turno disponible" | ❌ | Media |
| G12 | Validación por Consultorio/Sede (hoy solo por Profesional) | ❌ | Media |
| G13 | Colores por estado de atención (verde/azul/gris/naranja) | Parcial (estadoBadge 1-4) | Media |
| G14 | Sobreturnos/urgencias | ❌ | Baja |
| G15 | Línea de progreso del día (retrasos) | ❌ | Baja |
| G16 | Reasignación en bloque / lista de espera | ❌ | Baja-Media |
| G17 | Cancelación con motivo (UI) | Backend ✅, UI ❌ | Media — el backend ya exige motivo |
| G18 | Realtime Supabase (turnos) | ❌ (no habilitada) | Media (post-MVP) |
| G19 | `tsrange` + operador `&&` en BD | ❌ | Media (post-MVP) |
| G20 | Formulario registro rápido (DNI → auto-completar) | ❌ | Media |

---

## 3. Hoja de ruta propuesta (fases)

### Fase 1 — Fundamentos de la agenda (núcleo) ✅ COMPLETADA (commit `2d54647`)
1. **Plantilla de disponibilidad por profesional** (nueva entidad/CRUD): días, hora desde/hasta, duración estándar (15/20/30 min), sede/consultorio.
2. **Endpoint de disponibilidad real**: calcular slots libres (cruzar plantilla − citas existentes) `GET /v1/citas/disponibilidad → { slots }`.
3. **Colores por estado completos** (1-7) reutilizables en UI.
4. **Timeline multi-recurso** (línea de tiempo diaria con filas por profesional; sin librería nueva si el deadline lo exige — CSS grid sobre datos de `agenda-dia`).

_Cierre F1: entidad `DisponibilidadProfesional` + `DiaSemana`, CRUD `v1/disponibilidad`, slots libres en `GET /v1/citas/disponibilidad`, `estadoBadge` 1-7 en `App.tsx`, timeline diaria multi-recurso en `AgendaView`. Migración aplicada a Supabase con DDL manual (ver AGENTS.md)._

### Fase 2 — Interacción y consulta
5. **Vista de calendario con pestañas** diario/semanal/mensual/lista (evaluar FullCalendar vs. RBC).
6. **Panel lateral de detalle** con acciones del ciclo de vida (confirmar, iniciar, cancelar con motivo, reprogramar) + **historial** (consumir `/historial`).
7. **Filtros por estado** (ocultar realizadas/canceladas).
8. **Menú contextual 3 puntos** en cada bloque.
9. **Buscador "próximo turno disponible"** — salta al primer slot libre del profesional.

### Fase 3 — Mantenimiento y concurrencia
10. **Bloqueo preventivo de turno (5 min)**: servicio de bloqueo en .NET (`MemoryCache` con expiración + claim) y endpoint de reserva/liberación; validación atómica en BD.
11. **Drag & drop** para reprogramar (backend ya soporta `PUT` reprogramación).
12. **Reasignación en bloque** y lista de espera de reprogramación.
13. **Cancelación con motivo → notificación** (ya existe el flujo; conectar UI).

### Fase 4 — Tiempo real y optimización BD
14. Realtime Supabase en citas.
15. Migrar a `tsrange`/`EXCLUDE` constraint para no-solapamiento a nivel BD.

---

## 4. Acciones para implementar (próximo paso inmediato)

1. **Confirmar priorización** con el usuario (qué fase arranca primero).
2. Arrancar **Fase 1 punto 1**: entidad `DisponibilidadProfesional` en Domain + migración EF + CRUD (patrón de catálogos ya existente) + endpoint de slots.
3. Ajustar `estadoBadge` cubriendo estados 1-7 y reutilizarlo en la timeline.
4. Verificar API con cURL después de cada feature del backend.

---

## 5. Notas técnicas / decisiones

- **Librería calendario:** pendiente decisión (FullCalendar React vs React Big Calendar vs CSS grid propio). RDP propuesta: empezar con CSS grid para timeline diaria y evaluar librería solo si se necesita semanal/mensual con drag&drop pesado.
- **Concurrencia:** `MemoryCache` para bloqueo preventivo + `ConflictoHorarioException` ya existente para el check. Considerar `last-writer-wins` o `DistributedLock` si hay más de una instancia de la API.
- **Sin user/storage**: la app no tiene autenticidad; `CreadoPor/ModificadoPor` son strings que el frontend envía.
- **Realtime**: habilitar en Supabase dashboard (Realtime Tables) cuando esté la base estable.