# AGENTS.md

Solución .NET 8 para la gestión de citas médicas. Todo el código (identificadores, comentarios, códigos de error) está en español — respeta esa convención al escribir código nuevo.

## Proyectos y capas

- `AgendaMedica.Domain` — entidades, enums, excepciones, interfaces de repositorios/servicios. Sin dependencias.
- `AgendaMedica.Infrastructure` — EF Core 8 + SQL Server, repositorios, integración Microsoft Graph (Teams), notificaciones (SMTP/WhatsApp/SMS), jobs en segundo plano.
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
- No hay proyectos de test, ni migrations EF, ni CI/lint configurados.

## Gotchas operativos

- **El esquema de la BD no se genera desde el código** (no hay `EnsureCreated` ni `Migrate`, no existe carpeta `Migrations`). La BD SQL Server debe existir. La connection string `AgendaMedica` apunta a `Server=EII-54VK7TKB` con Windows auth (máquina local del dev). Al arrancar solo verifica `CanConnectAsync`.
- **Jobs en segundo plano se inician con la app**: `OutboxProcessor` (sincroniza citas a Teams vía Graph cada 15s, reintenta hasta 5 veces con backoff exponencial) y `RecordatorioProcessor` (recordatorios cada hora). Son resilientes y loguean warnings; no deben romper el arranque si Teams/notificaciones no están configurados.
- **Integraciones externas con placeholders**: `AzureAd`, `Graph`, `Smtp`, `WhatsApp`, `Sms` en `appsettings.json` son credenciales de ejemplo. El desarrollo local funciona solo con SQL; no rellenes ni elimines esas secciones.
- En builds `DEBUG`, EF habilita `EnableSensitiveDataLogging` y loguea SQL a consola.
