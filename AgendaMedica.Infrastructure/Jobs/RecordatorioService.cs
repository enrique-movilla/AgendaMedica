// ============================================================
//  AGENDA MÉDICA — SERVICIO DE RONDA DE RECORDATORIOS
//  Proyecto : AgendaMedica.Infrastructure / Jobs
//  Archivo  : RecordatorioService.cs
// ============================================================
//  Lógica de envío extraída de RecordatorioProcessor para poder
//  dispararla manualmente (endpoint de pruebas) además del job.
//  Configuración (appsettings, sección "Recordatorios"):
//    AnticipacionHoras : horas antes de la cita para avisar (24)
//    VentanaMinutos    : ancho de la ventana de captura (60)
//  IMPORTANTE: FechaHora se guarda en hora local colombiana
//  (timestamp sin zona), así que la ventana se calcula con la
//  hora de Colombia, no con UtcNow directamente.
// ============================================================

using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Interfaces;
using AgendaMedica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Infrastructure.Jobs;

public class RecordatorioService : IRecordatorioService
{
    private readonly AgendaDbContext _db;
    private readonly INotificacionService _notificaciones;
    private readonly IConfiguration _config;
    private readonly ILogger<RecordatorioService> _logger;

    public RecordatorioService(
        AgendaDbContext db,
        INotificacionService notificaciones,
        IConfiguration config,
        ILogger<RecordatorioService> logger)
    {
        _db            = db;
        _notificaciones = notificaciones;
        _config        = config;
        _logger        = logger;
    }

    public async Task<int> EnviarRondaAsync(CancellationToken ct = default)
    {
        var anticipacionHoras = LeerDouble("Recordatorios:AnticipacionHoras", 24);
        var ventanaMinutos    = LeerDouble("Recordatorios:VentanaMinutos", 60);

        var ahora = HoraColombia();
        var desde = ahora.AddHours(anticipacionHoras).AddMinutes(-ventanaMinutos);
        var hasta = ahora.AddHours(anticipacionHoras);

        var citas = await _db.Citas
            .Include(c => c.Paciente)
            .Include(c => c.Profesional)
            .Include(c => c.TipoCita)
            .Where(c =>
                c.FechaHora >= desde &&
                c.FechaHora <= hasta &&
                (c.EstadoCitaId == (byte)EstadoCita.Programada ||
                 c.EstadoCitaId == (byte)EstadoCita.Confirmada))
            .ToListAsync(ct);

        if (citas.Count == 0)
        {
            _logger.LogDebug("Recordatorios: no hay citas en la ventana [{Desde} - {Hasta}].",
                desde, hasta);
            return 0;
        }

        _logger.LogInformation("Recordatorios: enviando {N} recordatorios.", citas.Count);

        var enviados = 0;
        foreach (var cita in citas)
        {
            try
            {
                // No repetir: un recordatorio ya enviado para la cita
                var yaEnviado = await _db.NotificacionesLog.AnyAsync(n =>
                    n.CitaId     == cita.Id &&
                    n.TipoEvento == "Recordatorio" &&
                    n.Estado     == "Enviado", ct);

                if (yaEnviado) continue;

                await _notificaciones.EnviarRecordatorioAsync(cita, ct);
                enviados++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Error enviando recordatorio para cita {CitaId}", cita.Id);
            }
        }

        return enviados;
    }

    /// <summary>
    /// Hora actual de Colombia (UTC-5 sin horario de verano).
    /// FechaHora se almacena en hora local, por eso no se usa UtcNow.
    /// </summary>
    public static DateTime HoraColombia()
        => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ZonaColombia);

    // Windows: "SA Pacific Standard Time" · Linux/macOS: "America/Bogota"
    private static readonly TimeZoneInfo ZonaColombia = ObtenerZonaColombia();

    private static TimeZoneInfo ObtenerZonaColombia()
    {
        foreach (var id in new[] { "SA Pacific Standard Time", "America/Bogota" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc; // último recurso (conserva comportamiento anterior)
    }

    private double LeerDouble(string clave, double defecto)
        => double.TryParse(_config[clave], out var v) && v > 0 ? v : defecto;
}
