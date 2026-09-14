# Contexto de trabajo — Agenda Médica (UI/UX)

> **Rama actual:** `con-openspec`
> **Doc de referencia:** `docs/PreContexto_Agenda_UIUX.md`
> **Última verificación contra código:** 2026-09-14 (los estados ✅/◐/❌ de
> este archivo se comprobaron en disco, no en memoria de sesiones pasadas).
>
> Este archivo es el contexto consolidado para las pantallas de la agenda
> médica: **Asignación (crear), Revisión (consultar/filtrar) y
> Mantenimiento (editar/cancelar)**. Úsalo como checklist y hoja de ruta.

---

## 1. Mapa del roadmap (copiable a pizarra)

```text
 FASE 1            FASE 2              FASE 3              FASE 4           FASE 5/6
 Fundamentos       Interacción         Concurrencia        Tiempo real      Autenticación
   ✅ COMPLETA       ◐ CASI (1 hueco)    ◐ CASI (1 hueco)    ◐ A MEDIAS       ❌ FUTURA
      │                  │                   │                   │                │
      ▼                  ▼                   ▼                   ▼                ▼
 plantilla ✅       tabs 4 vistas ✅    bloqueo 5 min ✅    realtime ❌      login ❌
 slots libres ✅    detalle+histor.✅   drag & drop ✅      EXCLUDE ✅       RLS por rol ❌
 badge 1-7 ✅       filtros estado ✅   bloqueos/excep. ✅  (tsrange: no)   swagger tras
 timeline ✅        menú 3 puntos ◐     reasig. bloque ❌                    validación ❌
 agenda-rango ✅    próx. turno ✅      canc. motivo ✅
                    lista espera ❌
```

Huecos que quedan: **menú 3 puntos con acciones directas** (F2-8, hoy solo
abre el detalle), **reasignación en bloque / lista de espera** (F3-12),
**realtime** (F4-14). El resto de GAPS bajos (G12/G14/G15/G20) sigue ❌.

---

## 2. Estado real del código (verificado 2026-09-14)

### Backend (`.NET 8 + CQRS + EF Core 8/Npgsql`, Supabase)

- `CitasController.cs`: `GET /v1/citas/{id}`, `POST /v1/citas`,
  `PUT /v1/citas/{id}` (reprogramar), `PATCH /v1/citas/{id}/estado`,
  `POST /v1/citas/{id}/cancelar`, `GET /v1/citas/{id}/historial`,
  `GET /v1/citas/agenda-dia`, `GET /v1/citas/agenda-rango`,
  `GET /v1/citas/disponibilidad` (slots libres = plantilla − citas −
  bloqueos − excepciones).
- `Cita` (`Domain/Entities/Cita.cs`): máquina de estados completa, valida
  fecha futura, crea **Historial + Outbox en la misma transacción**.
- Anti-traslape en 2 capas: `ExisteTraslapeAsync` (fast-path) + constraint
  EXCLUDE `EX_Cita_Profesional_SinTraslape` en BD (backstop atómico);
  violación 23P01 → `ConflictoHorarioException` → 409 `HORARIO_OCUPADO`.
- Jobs: `OutboxProcessor` (Teams/Graph cada 15 s, 5 reintentos) y
  `RecordatorioProcessor` (recordatorios configurables + endpoints
  `POST /v1/notificaciones/recordatorios/disparar`, `GET /v1/notificaciones/log`).
- RLS: activada con política pública `anon` en las 21 tablas (DDL ejecutado
  en Supabase; norma permanente en `AGENTS.md` + `openspec/config.yaml`).

### Frontend (`frontend/src`, React + Tailwind, sin router)

- **AgendaView** (`views/AgendaView.tsx`): timeline diaria multi-recurso
  (CSS grid) + pestañas **diario / semanal / mensual / lista**
  (`vista`, `:372,564-567,687-716`); chips de **filtro por estado** con
  toggle + "Todos" (`estadosActivos`, `:381,642-667`); botón **próximo
  turno disponible** (`buscarProximoTurno`, `:503-617`); **menú de
  3 puntos** por bloque (`MenuTresPuntos`, `:902` — hoy abre el detalle,
  sin acciones directas); **drag & drop** para reprogramar
  (`reprogramarArrastre`, `:479`); detalle en popup de 2 columnas con
  **historial** (`PanelDetalleCita`, `:1486-1596`, consume `/historial`).
- **SelectorRecursos** + **perfiles simulados** (`lib/perfil.ts`, claves
  `agenda:{u1|u2}:recursos:{favoritos,seleccion,conocidos,recientes}`);
  sin usuarios reales: al llegar auth, `perfil.ts` se reemplaza.
- Catálogos e identidad multi-vertical (`CatalogoContext`, clave 49
  `MsgSeleccionarCliente`).

---

## 3. GAP — estado real a 2026-09-14

| # | Requisito | Estado real | Impacto |
|---|-----------|-------------|---------|
| G1 | Vista de calendario / cronograma | ✅ 4 vistas (sin librería externa) | — |
| G2 | Timeline multi-recurso | ✅ CSS grid diaria + semanal | — |
| G3 | Pestañas diario / semanal / mensual / lista | ✅ | — |
| G4 | Disponibilidad real + plantillas | ✅ (plantilla − citas − bloqueos − excepciones) | — |
| G5 | Filtros por estado | ✅ chips; ⏳ falta persistencia por perfil (en curso) | Media |
| G6 | Panel detalle + historial en UI | ✅ popup 2 col. + `/historial` | — |
| G7 | Drag & drop para reprogramar | ✅ | — |
| G8 | Menú 3 puntos (Reprogramar/Duplicar/Cancelar) | ◐ existe, pero ambas opciones solo abren el detalle | Media |
| G9 | Bloqueo preventivo 5 min | ✅ servicio + claim | — |
| G10 | Filtro entidades cruzadas | ✅ parcial (selector recursos + filtros vistas) | Baja |
| G11 | Buscador "próximo turno disponible" | ✅ | — |
| G12 | Validación por Consultorio/Sede | ❌ solo por Profesional | Media |
| G13 | Colores por estado 1-7 | ✅ `estadoBadge` reutilizable | — |
| G14 | Sobreturnos/urgencias | ❌ | Baja |
| G15 | Línea de progreso del día | ❌ | Baja |
| G16 | Reasignación en bloque / lista de espera | ❌ | Baja-Media |
| G17 | Cancelación con motivo (UI) | ✅ catálogo `MotivoCancelacion` dinámico | — |
| G18 | Realtime Supabase | ❌ (F4-14) | Media (post-MVP) |
| G19 | `tsrange` + `&&` en BD | ◐ EXCLUDE ✅, `tsrange` ❌ | Baja |
| G20 | Registro rápido (DNI → autocompletar) | ❌ | Media |

---

## 4. Hoja de ruta por fases (estado real)

### Fase 1 — Fundamentos ✅ COMPLETADA

Plantilla `DisponibilidadProfesional` + CRUD, slots libres, badge 1-7,
timeline multi-recurso, `agenda-rango`.

### Fase 2 — Interacción ◐ (4/5 + 1 parcial)

5. ✅ Calendario con pestañas (CSS grid propio, sin FullCalendar/RBC).
6. ✅ Panel detalle + historial.
7. ✅ Filtros por estado → ⏳ **en curso: persistencia por perfil**.
8. ◐ Menú 3 puntos (existe; **falta: acciones directas** Reprogramar /
   Duplicar / Cancelar sin pasar por el detalle).
9. ✅ Próximo turno disponible.

### Fase 3 — Mantenimiento ◐ (3/4)

10. ✅ Bloqueo preventivo. 11. ✅ Drag & drop. 12. ❌ Reasignación en
bloque / lista de espera. 13. ✅ Cancelación con motivo + notificación.

### Fase 4 — Tiempo real ◐ (1/2)

14. ❌ Realtime Supabase. 15. ✅ EXCLUDE anti-traslape + snapshot EF
sincronizado.

### Extras con spec / pendientes de usuario

- **Tablero de ocupación**: spec v1 solo-lectura en
  `docs/TableroOcupacion_Especificacion.md` (no codificar sin orden);
  puede reusar `agenda-rango` existente.
- **Pendiente usuario**: credenciales SMTP + email de prueba;
  validación visual del selector de recursos.
- **Fase 5/6 (futura)**: autenticación real (reemplaza `perfil.ts`),
  RLS por rol/dueño con `auth.uid()`, `/swagger` tras validación.

---

## 5. Próximo paso inmediato

1. **Persistencia de filtros por estado** (G5): guardar `estadosActivos`
   por perfil simulado (`u1`/`u2`) siguiendo el patrón
   `leerIdsPerfil`/`guardarIdsPerfil` de `lib/perfil.ts`, con migración
   de clave heredada a `u1`; evaluar filtrado en memoria vs. refetch.
2. Después: acciones directas del menú 3 puntos (F2-8) o verificación
   visual en `http://localhost:5173`.

---

## 6. Notas técnicas / decisiones

- **Librería calendario:** decisión tomada — CSS grid propio; no evaluar
  FullCalendar/RBC salvo que semanal/mensual con dnd pesado lo exija.
- **Concurrencia:** `MemoryCache` + `ConflictoHorarioException`; considerar
  `DistributedLock` si hay más de una instancia de la API.
- **Sin usuarios reales**: `CreadoPor/ModificadoPor` son strings del
  frontend; perfiles `u1`/`u2` en `localStorage` (MVP temporal).
- **Realtime**: habilitar en Supabase dashboard cuando la base esté estable.
- **RLS**: ver norma permanente en `AGENTS.md` (toda tabla nueva con
  `ENABLE ROW LEVEL SECURITY` + política pública `anon`).
