# AGENTS.md

Solución .NET 8 para la gestión de citas médicas. Todo el código (identificadores, comentarios, códigos de error) está en español — respeta esa convención al escribir código nuevo.

## Proyectos y capas

- `AgendaMedica.Domain` — entidades, enums, excepciones, interfaces de repositorios/servicios. Sin dependencias.
- `AgendaMedica.Infrastructure` — EF Core 8 + PostgreSQL (Supabase), repositorios, integración Microsoft Graph (Teams), notificaciones (SMTP/WhatsApp/SMS), jobs en segundo plano.
- `AgendaMedica.Application` — MediatR commands/queries/handlers. **Quirk: referencia a Infrastructure** (no es Clean Architecture estricto); no lo "corrijas". Los handlers dependen de las interfaces de `Domain` (`IUnitOfWork`, `INotificacionService`, etc.), no de implementaciones.
- `AgendaMedica.Api` — controladores, Swagger, middleware de excepciones.

`Program.cs` usa `AddInfrastructure(config)` (registra DbContext, repos, servicios) y `AddApplication()` (registra MediatR + pipeline de logging).

## Convenciones de código

- Command/Query/DTOs están consolidados en pocos archivos: `Commands/OtrosComandos.cs`, `Queries/Queries.cs`, `DTOs/DTOs.cs`, `DTOs/MapeadorExtensions.cs` (extensiones `.ToDto()`). La excepción es `Commands/CrearCita/` que tiene archivo propio. Sigue este patrón consolidado, no crees un archivo por handler.
- Excepciones de dominio (`Domain/Exceptions/DomainExceptions.cs`) controlan el HTTP: `EntidadNoEncontradaException`→404, `ConflictoHorarioException`/`EntidadDuplicadaException`→409, `DomainException`→422 (mapeado en `Program.cs`). Los handlers las lanzan y `ExceptionBehavior` las loguea.
- `AgendaDbContext.SaveChangesAsync` setea `FechaModificacion` automáticamente para `EntidadBase`. Los mensajes de dominio van a la tabla `OutboxMensaje` dentro de la misma transacción (patrón outbox).

## Comandos

- Build/verify: `dotnet build AgendaMedica.sln` (SDK 10 local compila net8.0 sin advertencias).
- Ejecutar: `dotnet run --project AgendaMedica.Api` — perfil `http` en `http://localhost:5047/swagger` (ver `launchSettings.json`).
- Frontend: `npm.cmd run build` (tsc -b && vite build) en `frontend/`. Dev server Vite en `http://localhost:5173` (sin proxy; baseURL API en `frontend/src/lib/api.ts`).
- No hay proyectos de test ni CI/lint configurados.

## Estado del roadmap UI/UX (branch `feature/ui-ux`)

- **Roadmap y checklist:** `Contexto_Agenda_UIUX.md` (raíz del repo). Define las 3 pantallas (Asignación / Revisión / Mantenimiento), los GAPS (G1-G20) y la hoja de ruta en 4 fases.
- **Documento de requerimientos fuente:** `docs/PreContexto_Agenda_UIUX.md`.
- **FASE 1 COMPLETADA** (commit `2d54647`): entidad `DisponibilidadProfesional` + CRUD `v1/disponibilidad`, slots libres en `GET /v1/citas/disponibilidad` (cruza plantilla − citas), `estadoBadge` con estados 1-7 y timeline diaria multi-recurso en `AgendaView` (CSS grid, selección múltiple de profesionales).
- **SIGUIENTE: FASE 2** (itens 5-9 del roadmap): calendario con pestañas diario/semanal/mensual/lista, panel lateral de detalle con acciones del ciclo de vida + historial, filtros por estado, menú contextual de 3 puntos, buscador "próximo turno disponible".
- **Regla:** antes de tocar pantallas de agenda (AgendaView, NuevaCitaView, o nuevos endpoints de citas/disponibilidad), revisar `Contexto_Agenda_UIUX.md` y `docs/PreContexto_Agenda_UIUX.md` y alinearse con la fase en curso.

## Gotchas operativos

- **BD PostgreSQL en Supabase** (antes se usó SQL Server local; hoy la app apunta a Supabase). `appsettings.json` tiene la connection string real `SupabaseConnection` (pooler de Supabase, SSL required). **No commitear la contraseña real**: el archivo en git está sanitizado (`Password=SUSTITUIR_POR_CONTRASENA`) y el working copy mantiene la real vía `git update-index --skip-worktree`.
- **Migrations EF**: la carpeta `Migrations` existe. La migración inicial `20260805072936_InicializacionPostgresLimpia` ya está aplicada en Supabase (registrada en `__EFMigrationsHistory`). La Fase 1 añadió `20260809060015_AgregarDisponibilidadProfesional`, reescrita manualmente a solo CreateTable (el snapshot previo estaba desincronizado y generó drops/alters indeseados) y **aplicada a Supabase con DDL directo + INSERT en `__EFMigrationsHistory`**, no con `dotnet ef database update`. Para agregar columnas/tablas nuevas prefiere DDL manual idempotente (o `migrations add` + revisar/limpiar el diff) y registrar en la tabla de historial. Verificar siempre con `GET /v1/disponibilidad` y `GET /v1/citas/disponibilidad`.
- **Jobs en segundo plano se inician con la app**: `OutboxProcessor` (sincroniza citas a Teams vía Graph cada 15s, reintenta hasta 5 veces con backoff exponencial) y `RecordatorioProcessor` (recordatorios cada hora). Son resilientes y loguean warnings; no deben romper el arranque si Teams/notificaciones no están configurados.
- **Integraciones externas con placeholders**: `AzureAd`, `Graph`, `Smtp`, `WhatsApp`, `Sms` en `appsettings.json` son credenciales de ejemplo. El desarrollo local funciona solo con Supabase; no rellenes ni elimines esas secciones.
- En builds `DEBUG`, EF habilita `EnableSensitiveDataLogging` y loguea SQL a consola.

## Punto de reanudo (Estado de la sesión)

- Rama `feature/ui-ux`, todo pusheado a `origin` (repo `https://github.com/enrique-movilla/AgendaMedica`). Últimos commits: `11da250` (bloqueos de agenda + excepciones horarias, Fase 3), `dcb0420` (bloquear profesional al editar horarios).
- **Producción desplegada**: frontend `https://agenda-medica-lime.vercel.app` (Vercel, root dir `frontend`, desplegar desde la raíz con `npx.cmd vercel --prod --yes`) y API `https://emovilla-001-site1.jtempurl.com` (SmarterASP, `site1/` por FTP `ftp://win8229.site4now.net/` user `emovilla-001` pass `RNsPV-5gB`; para re-desplegar, subir los DLL del publish y, si un archivo da 550 por estar bloqueado por el app pool, tocar `web.config` para forzar recycle y reintentar).
- **Fase 3 casi completa**: items 10 (bloqueo preventivo), 11 (drag & drop) y la ampliación "bloqueos de agenda + excepciones horarias" (nuevas entidades `BloqueoAgenda`/`ExcepcionHoraria`, tablas en Supabase vía DDL idempotente + migración `20260811120000_AgregarBloqueosYExcepciones`, endpoints `v1/BloqueosAgenda` y `v1/ExcepcionesHorarias`, integradas en `GenerarSlotsLibres` de `Queries.cs`) están hechos y desplegados.
- **SIGUIENTE (Fase 3, pendiente) — ver `Contexto_Agenda_UIUX.md` §3 item 12**:
  1. **Item 12 — Reasignación en bloque y lista de espera de reprogramación** (G16). Diseñar flujo: selección múltiple de citas + reprogramar juntas; lista de espera para reprogramación.
- **Item 13 completado**: catálogo `MotivoCancelacion` en BD + API + UI (select dinámico desde `/v1/catalogo/motivos-cancelacion`). Citar cancelación funciona con categorías de BD.
- Pendientes menores de UI (no bloqueados): menú contextual de 3 puntos en la timeline (item 8 de Fase 2), filtros por estado (item 7).