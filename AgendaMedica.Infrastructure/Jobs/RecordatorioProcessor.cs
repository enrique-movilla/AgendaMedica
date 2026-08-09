// ============================================================
//  AGENDA MÉDICA — RECORDATORIO PROCESSOR
//  Proyecto : AgendaMedica.Infrastructure / Jobs
//  Archivo  : RecordatorioProcessor.cs
// ============================================================
//  Job que se ejecuta cada hora y envía recordatorios a los
//  pacientes con citas programadas para las próximas 24 horas.
//  Solo envía a citas con estado Programada o Confirmada.
// ============================================================

using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Interfaces;
using AgendaMedica.Infrastructure.Data;
using AgendaMedica.Infrastructure.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Infrastructure.Jobs;

public class RecordatorioProcessor : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RecordatorioProcessor> _logger;

    private static readonly TimeSpan Intervalo = TimeSpan.FromHours(1);

    public RecordatorioProcessor(
        IServiceScopeFactory scopeFactory,
        ILogger<RecordatorioProcessor> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation("RecordatorioProcessor iniciado.");

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await EnviarRecordatoriosAsync(ct);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error en RecordatorioProcessor.");
            }

            await Task.Delay(Intervalo, ct);
        }
    }

    private async Task EnviarRecordatoriosAsync(CancellationToken ct)
    {
        using var scope      = _scopeFactory.CreateScope();
        var db               = scope.ServiceProvider.GetRequiredService<AgendaDbContext>();
        var notificaciones   = scope.ServiceProvider.GetRequiredService<INotificacionService>();

        var ahora   = DateTime.UtcNow;
        var en24h   = ahora.AddHours(24);
        var en23h   = ahora.AddHours(23);

        // Citas en la ventana de 23h-24h a partir de ahora
        // (se ejecuta cada hora, la ventana de 1h evita duplicados)
        var citas = await db.Citas
            .Include(c => c.Paciente)
            .Include(c => c.Profesional)
            .Include(c => c.TipoCita)
            .Where(c =>
                c.FechaHora >= en23h &&
                c.FechaHora <= en24h &&
                (c.EstadoCitaId == (byte)EstadoCita.Programada ||
                 c.EstadoCitaId == (byte)EstadoCita.Confirmada))
            .ToListAsync(ct);

        if (!citas.Any())
        {
            _logger.LogDebug(
                "RecordatorioProcessor: no hay citas en las próximas 24h.");
            return;
        }

        _logger.LogInformation(
            "RecordatorioProcessor: enviando {N} recordatorios.", citas.Count);

        foreach (var cita in citas)
        {
            try
            {
                // Verificar que no se haya enviado ya un recordatorio
                var yaEnviado = await db.NotificacionesLog.AnyAsync(n =>
                    n.CitaId    == cita.Id &&
                    n.TipoEvento == "Recordatorio" &&
                    n.Estado     == "Enviado", ct);

                if (!yaEnviado)
                    await notificaciones.EnviarRecordatorioAsync(cita, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Error enviando recordatorio para cita {CitaId}", cita.Id);
            }
        }
    }
}
