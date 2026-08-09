// ============================================================
//  AGENDA MÉDICA — INTERFAZ DE NOTIFICACIONES
//  Proyecto : AgendaMedica.Domain / Interfaces
//  Archivo  : INotificacionService.cs
// ============================================================
//  La interfaz vive en Domain para que Application pueda
//  usarla sin referenciar directamente a Infrastructure.
//  La implementación concreta (NotificacionService) sigue
//  en Infrastructure/Notifications/.
// ============================================================

using AgendaMedica.Domain.Entities;

namespace AgendaMedica.Domain.Interfaces;

public interface INotificacionService
{
    Task NotificarCreacionCitaAsync(Cita cita, CancellationToken ct = default);
    Task NotificarConfirmacionCitaAsync(Cita cita, CancellationToken ct = default);
    Task NotificarCancelacionCitaAsync(Cita cita, string motivo, CancellationToken ct = default);
    Task NotificarReprogramacionCitaAsync(Cita cita, CancellationToken ct = default);
    Task EnviarRecordatorioAsync(Cita cita, CancellationToken ct = default);
}
