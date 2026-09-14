# AGENTS.md — Proyecto Agenda (copia independiente)

## Arranque del ambiente (leer siempre al abrir el proyecto)

- **Carpeta de trabajo oficial:** `E:\Proyecto Agenda`. Es copia independiente de `E:\Proyecto HCE 2026\Aplicacion\AgendaMedica` creada el 2026-09-10. Abrir siempre esta carpeta, no el original, para no interferir con los otros proyectos.
- **Respaldo:** `C:\Users\ajm7c\OneDrive\Documents\Default Project` se deja como está, solo como respaldo. No trabajar ahí.
- **Nombre del proyecto:** Proyecto Agenda (repo git: `AgendaMedica`).
- **Stack:** backend C# .NET 8, datos PostgreSQL en Supabase (Transact SQL de Postgres), endpoints prod en SmarterASP, frontend React + Vite (despliegue en Vercel).
- **Requisitos verificados:** .NET SDK 8.0.424+ (hay 8/9/10 instalados), Node v22.22.0 + npm 10.9.4, Git 2.50.1.
- **Git (respaldo y enlace):** remoto `origin https://github.com/enrique-movilla/AgendaMedica.git`, rama de trabajo `inicio-de-agenda-general`. Al abrir: `git fetch origin --prune` + `git status --short --branch`. Debe estar limpio.
- **Secreto local:** `AgendaMedica.Api/appsettings.json` tiene `skip-worktree` y guarda la contraseña real de Supabase solo en el working copy. No commitear la contraseña; en git queda `Password=SUSTITUIR_POR_CONTRASENA`.
- **Backend (verificado 2026-09-10, 0 warnings/0 errores):** `dotnet build AgendaMedica.sln` y `dotnet run --project AgendaMedica.Api` → `http://localhost:5047/swagger`. Apunta al pooler de Supabase (`aws-0-sa-east-1.pooler.supabase.com`, SSL requerido).
- **Frontend (verificado 2026-09-10, `npm run build` OK):** en `frontend/`: `npm install`, `npm run dev` → `http://localhost:5173`, `npm run build` (tsc -b && vite build). `src/lib/api.ts` usa `VITE_API_URL ?? 'http://localhost:5047'`. `frontend/.env.production` apunta a `https://emovilla-001-site1.jtempurl.com`.
- **Producción:** frontend Vercel `https://agenda-medica-lime.vercel.app` (root `frontend`); API SmarterASP `https://emovilla-001-site1.jtempurl.com` (FTP `ftp://win8229.site4now.net/`, usuario en AGENTS original).
- **Chequeo rápido de sesión:** 1) `git fetch + status`, 2) `dotnet build AgendaMedica.sln`, 3) `npm run build` en `frontend/`. Si algo falla, no seguir con cambios hasta dejarlo verde.

---

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
- **RLS en Supabase (norma permanente)**: toda tabla nueva se crea con DDL manual idempotente que incluya `ALTER TABLE public."X" ENABLE ROW LEVEL SECURITY;` + `DROP POLICY IF EXISTS "Permitir acceso público total" ON public."X";` + `CREATE POLICY "Permitir acceso público total" ON public."X" FOR ALL TO anon USING (true) WITH CHECK (true);`. Usar schema `public` e identificadores entrecomillados. No aplicar RLS a `__EFMigrationsHistory`. La política abierta es el default de desarrollo; en Fase 5/6 (autenticación) se endurece por rol/dueño con `auth.uid()`.

## Punto de reanudo (Estado de la sesión)

- Rama `feature/ui-ux`, todo pusheado a `origin` (repo `https://github.com/enrique-movilla/AgendaMedica`). Últimos commits: `c82ce8f` (iniciar atención 'en desarrollo', modales con createPortal, botones arriba del detalle), `911824f` (modal de cancelación con createPortal), `7b30b0b` (botones arriba + modal cancelación), `a99ae5c` (catálogo MotivoCancelacion).
- **Producción desplegada**: frontend `https://agenda-medica-lime.vercel.app` (Vercel, root dir `frontend`, desplegar desde la raíz con `npx.cmd vercel --prod --yes`) y API `https://emovilla-001-site1.jtempurl.com` (SmarterASP, `site1/` por FTP `ftp://win8229.site4now.net/` user `emovilla-001` pass `RNsPV-5gB`; para re-desplegar, subir los DLL del publish y, si un archivo da 550 por estar bloqueado por el app pool, tocar `web.config` para forzar recycle y reintentar).
- **Fase 3 casi completa**: items 10 (bloqueo preventivo), 11 (drag & drop) y la ampliación "bloqueos de agenda + excepciones horarias" (nuevas entidades `BloqueoAgenda`/`ExcepcionHoraria`, tablas en Supabase vía DDL idempotente + migración `20260811120000_AgregarBloqueosYExcepciones`, endpoints `v1/BloqueosAgenda` y `v1/ExcepcionesHorarias`, integradas en `GenerarSlotsLibres` de `Queries.cs`) están hechos y desplegados.
- **SIGUIENTE: FASE 4** (ver `Contexto_Agenda_UIUX.md`): ver qué incluye la fase 4.
- **Item 13 completado**: catálogo `MotivoCancelacion` en BD + API + UI (select dinámico desde `/v1/catalogo/motivos-cancelacion`). Citar cancelación funciona con categorías de BD.
- Pendientes menores de UI (no bloqueados): menú contextual de 3 puntos en la timeline (item 8 de Fase 2), filtros por estado (item 7).
- **Fase 4 ítem 15 en curso (rama `inicio-de-agenda-general`)**: constraint EXCLUDE `EX_Cita_Profesional_SinTraslape` **aplicado en Supabase** 2026-09-06 (DDL en `docs/Fase4_Item15_EXCLUDE_TraslapeCita.sql`, pasos 0-4 verificados, historial `20260906050000_AgregarExclusionTraslapeCita` registrado) + traducción de 23P01 a `ConflictoHorarioException` en `AgendaDbContext.SaveChangesAsync` (cubre crear y reprogramar; smoke test local 200 en `GET /v1/disponibilidad` y `GET /v1/citas/disponibilidad`). El check previo `ExisteTraslapeAsync` se mantiene como fast-path; la BD es el backstop atómico. **Snapshot EF sincronizado** con migración `20260906054326_SincronizarModeloFase3` (Up/Down vacíos: tablas BloqueoAgenda/ExcepcionHoraria/MotivoCancelacion/CatalogoTermino + `IX_Sede_Nombre` ya existían en Supabase; historial `20260906054326_SincronizarModeloFase3` registrado 2026-09-06). De paso se corrigió el typo `now() at time zone 'utc'()` → `'utc'` en `CatalogosConfiguration.cs`/`EntidadesCompartidasConfiguration.cs`. No se crearon archivos de migración para el EXCLUDE (EF no modela exclusion constraints; se siguió el precedente de Bloqueos/Excepciones). API re-desplegada en SmarterASP 2026-09-06 (traducción 23P01→409 en producción, verificado 200).
- **Swagger habilitado en producción** (`Program.cs`: se retiró el gate `IsDevelopment` porque el `web.config` de SmarterASP no fija entorno y `/swagger` daba 404; re-desplegado y verificado 200). **Decisión registrada:** al agregar autenticación/seguridad (Fase 5/6), `/swagger` debe quedar detrás de validación-autenticación.
- **Notificaciones pre-Fase 4 (rama `inicio-de-agenda-general`, sin commit)**: `IRecordatorioService` (ventana con hora Colombia + `Recordatorios:AnticipacionHoras/VentanaMinutos/IntervaloMinutos` en appsettings) usado por `RecordatorioProcessor` y por `POST /v1/notificaciones/recordatorios/disparar`; `GET /v1/notificaciones/log` para consultar `NotificacionLog`; DTOs en `DTOs.cs`, comando en `OtrosComandos.cs`, query en `Queries.cs`. Smoke local OK (200/200, `enviados:0`). Pendiente del usuario: credenciales SMTP (app password Gmail) en el `appsettings.json` local (tiene skip-worktree) y datos de prueba con email real. Nota commit: la sección `Recordatorios` está solo en el working copy (skip-worktree); al commitear hay que llevarla al appsettings sanitizado sin tocar el password real (vía hash-object, no edit directo).
- **Selector de recursos + perfiles simulados (MVP, 2026-09-10, commit `b9f8af0` pusheado)**: `AgendaView` usa `SelectorRecursos` (buscador con autocompletado + chips + favoritos + aviso de novedades, `frontend/src/views/AgendaView.tsx`). Ambiente por operador en `localStorage` con claves por perfil (`frontend/src/lib/perfil.ts`: `agenda:{u1|u2}:recursos:{favoritos,seleccion,conocidos,recientes}` + `agenda:perfil:activo`); las claves heredadas sin perfil migran al Usuario 1 al leer. Menú con botones Usuario 1 (azul) / Usuario 2 (verde) debajo de "Identidad de Aplicación" (`App.tsx`, `key={perfil}` en `AgendaView` para remontar al cambiar). Sin cambios de backend/BD. Resumen de la sesión en `docs/Sesion_2026-09-10_SelectorRecursos_Perfiles.md`. Pendiente del usuario: validación visual del selector y luego dashboard de ocupación total a demanda.
- **Catálogo `MsgSeleccionarCliente` = 49 (2026-09-10, commit `4235b85` pusheado)**: mensaje de Reservas ("Seleccione el cliente...") configurable por identidad. Enum en `Domain/Enums/Enums.cs` + seeds por vertical en `OtrosComandos.cs`/`SeedTodasVerticales.cs` (salud=paciente, resto=cliente; seed solo inserta faltantes). Frontend registra la clave (`types.ts`, `CatalogoContext` 49+default, `constants.ts`, `IdentidadView`) y `NuevaCitaView` usa `t()`. Término sembrado en Supabase tenant 1/default (id 244). API re-desplegada en SmarterASP 2026-09-10 (recycle vía `web.config` por 550, swagger+term49 prod 200) y frontend en Vercel (READY, alias verificado 200).