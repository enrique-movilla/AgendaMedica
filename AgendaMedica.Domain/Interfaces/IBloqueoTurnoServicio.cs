// ============================================================
//  AGENDA MÉDICA — BLOQUEO PREVENTIVO DE TURNOS (Fase 3)
//  Proyecto : AgendaMedica.Domain / Interfaces
//  Archivo  : IBloqueoTurnoServicio.cs
// ============================================================
//  La interfaz vive en Domain para que Application pueda
//  usarla sin referenciar directamente a Infrastructure.
//  La implementación concreta (BloqueoTurnoServicio) sigue
//  en Infrastructure/Servicios/ y usa MemoryCache con TTL.
// ============================================================

namespace AgendaMedica.Domain.Interfaces;

/// <summary>
/// Resultado de una reserva de turno. Si tiene éxito devuelve el
/// identificador único del bloqueo (token) que el cliente debe
/// enviar al crear la cita como prueba de reserva.
/// </summary>
public record ResultadoReservaBloqueo(
    bool     Exitoso,
    string?  BloqueoId,
    string?  Token,
    DateTime ExpiraEn,
    string?  MotivoRechazo = null);

/// <summary>
/// Reserva (claim) de un turno específico por 5 minutos.
/// Previene que dos usuarios agenden el mismo slot en paralelo.
/// La validación definitiva es atómica en BD al crear la cita.
/// </summary>
public interface IBloqueoTurnoServicio
{
    Task<ResultadoReservaBloqueo> ReservarAsync(
        int profesionalId, DateOnly fecha, string horaInicio,
        string usuario, CancellationToken ct = default);

    Task<ResultadoReservaBloqueo> RenovarAsync(
        string bloqueoId, CancellationToken ct = default);

    Task<bool> LiberarAsync(string bloqueoId, CancellationToken ct = default);

    Task<bool> EsValidoAsync(
        int profesionalId, DateOnly fecha, string horaInicio,
        string bloqueoId, CancellationToken ct = default);
}