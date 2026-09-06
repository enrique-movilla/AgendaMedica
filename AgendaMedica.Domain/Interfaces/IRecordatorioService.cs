// ============================================================
//  AGENDA MÉDICA — SERVICIO DE RONDA DE RECORDATORIOS
//  Proyecto : AgendaMedica.Domain / Interfaces
//  Archivo  : IRecordatorioService.cs
// ============================================================
//  Extrae la lógica de RecordatorioProcessor a un servicio
//  inyectable para poder disparar rondas manualmente
//  (endpoint POST v1/notificaciones/recordatorios/disparar).
// ============================================================

namespace AgendaMedica.Domain.Interfaces;

public interface IRecordatorioService
{
    /// <summary>
    /// Envía recordatorios a las citas dentro de la ventana
    /// configurada (Recordatorios:AnticipacionHoras/VentanaMinutos).
    /// </summary>
    /// <returns>Número de recordatorios enviados en la ronda.</returns>
    Task<int> EnviarRondaAsync(CancellationToken ct = default);
}
