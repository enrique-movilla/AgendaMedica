// ============================================================
//  AGENDA MÉDICA — OUTBOX PROCESSOR
//  Proyecto : AgendaMedica.Infrastructure / Jobs
//  Archivo  : OutboxProcessor.cs
// ============================================================
//  Procesa los mensajes pendientes en dbo.OutboxMensaje.
//  Cada vez que se crea, reprograma o cancela una cita,
//  se genera un OutboxMensaje. Este job lo lee y lo envía
//  a Microsoft Teams via Graph API.
//
//  Patrón Outbox: la cita y el mensaje se guardan juntos
//  en la misma transacción SQL. Si Teams falla, el mensaje
//  queda pendiente y se reintenta hasta 5 veces con
//  backoff exponencial.
// ============================================================

using AgendaMedica.Domain.Entities;
using AgendaMedica.Infrastructure.Data;
using AgendaMedica.Infrastructure.Integrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace AgendaMedica.Infrastructure.Jobs;

public class OutboxProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OutboxProcessor> _logger;

    // Intervalo entre ejecuciones del job
    private static readonly TimeSpan Intervalo = TimeSpan.FromSeconds(15);

    public OutboxProcessor(
        IServiceScopeFactory scopeFactory,
        ILogger<OutboxProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation("OutboxProcessor iniciado.");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ProcesarPendientesAsync(ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error en ciclo del OutboxProcessor.");
            }

            await Task.Delay(Intervalo, ct);
        }

        _logger.LogInformation("OutboxProcessor detenido.");
    }

    // ── Procesar mensajes pendientes ──────────────────────────
    private async Task ProcesarPendientesAsync(CancellationToken ct)
    {
        using var scope  = _scopeFactory.CreateScope();
        var db           = scope.ServiceProvider.GetRequiredService<AgendaDbContext>();
        var graphService = scope.ServiceProvider.GetRequiredService<IMicrosoftGraphService>();

        // Traer pendientes con datos relacionados necesarios
        var pendientes = await db.OutboxMensajes
            .Include(o => o.Cita)
                .ThenInclude(c => c!.Paciente)
            .Include(o => o.Cita)
                .ThenInclude(c => c!.Profesional)
            .Include(o => o.Cita)
                .ThenInclude(c => c!.TipoCita)
            .Where(o => !o.Procesado && o.Intentos < 5)
            .OrderBy(o => o.FechaCreacion)
            .Take(10)
            .ToListAsync(ct);

        //if (!pendientes.Any()) return;
        if (pendientes.Count == 0) return;

        _logger.LogInformation(
            "OutboxProcessor: procesando {N} mensajes pendientes.", pendientes.Count);

        foreach (var msg in pendientes)
        {
            await ProcesarMensajeAsync(msg, graphService, db, ct);
        }

        await db.SaveChangesAsync(ct);
    }

    // ── Procesar un mensaje individual ────────────────────────
    private async Task ProcesarMensajeAsync(
        OutboxMensaje msg,
        IMicrosoftGraphService graphService,
        AgendaDbContext db,
        CancellationToken ct)
    {
        string? error         = null;
        string? teamsEventId  = null;
        string? teamsJoinUrl  = null;

        try
        {
            var cita = msg.Cita!;
            var profesionalEmail = cita.Profesional?.Email;

            if (string.IsNullOrWhiteSpace(profesionalEmail))
            {
                _logger.LogWarning(
                    "Outbox {Id}: profesional sin email, no se puede sincronizar Teams.",
                    msg.Id);
                msg.RegistrarIntento("Profesional sin email configurado.");
                return;
            }

            switch (msg.TipoOperacion)
            {
                case "CrearEvento":
                    var dto = new CrearEventoTeamsDto(
                        CitaId:            cita.Id,
                        ProfesionalEmail:  profesionalEmail,
                        ProfesionalNombre: cita.Profesional!.NombresCompletos,
                        PacienteNombre:    cita.Paciente!.NombresCompletos,
                        TipoCita:          cita.TipoCita!.Nombre,
                        FechaHora:         cita.FechaHora,
                        FechaHoraFin:      cita.FechaHoraFin,
                        MotivoConsulta:    cita.MotivoConsulta
                    );
                    var resultado = await graphService.CrearEventoAsync(dto, ct);
                    teamsEventId = resultado.TeamsEventId;
                    teamsJoinUrl = resultado.TeamsJoinUrl;
                    break;

                case "ActualizarEvento":
                    if (!string.IsNullOrEmpty(cita.TeamsEventId))
                        await graphService.ActualizarEventoAsync(
                            cita.TeamsEventId, profesionalEmail,
                            cita.FechaHora, cita.FechaHoraFin, ct);
                    break;

                case "CancelarEvento":
                    if (!string.IsNullOrEmpty(cita.TeamsEventId))
                        await graphService.CancelarEventoAsync(
                            cita.TeamsEventId, profesionalEmail,
                            "Cita cancelada desde Agenda Médica.", ct);
                    break;

                default:
                    _logger.LogWarning(
                        "Outbox {Id}: operación desconocida '{Op}'",
                        msg.Id, msg.TipoOperacion);
                    break;
            }
        }
        catch (Exception ex)
        {
            error = ex.Message;
            _logger.LogWarning(ex,
                "Outbox {Id} falló (intento {N}): {Msg}",
                msg.Id, msg.Intentos + 1, ex.Message);

            // Backoff exponencial: 2s, 4s, 8s, 16s, 32s
            var espera = TimeSpan.FromSeconds(Math.Pow(2, msg.Intentos));
            await Task.Delay(espera, ct);
        }

        // Registrar resultado en el mensaje
        msg.RegistrarIntento(error);

        // Si fue exitoso y hay TeamsEventId, actualizar la cita
        if (error is null && teamsEventId is not null)
        {
            var cita = await db.Citas.FindAsync(new object[] { msg.CitaId }, ct);
            if (cita is not null)
                cita.RegistrarEventoTeams(teamsEventId, teamsJoinUrl);
        }
    }
}
