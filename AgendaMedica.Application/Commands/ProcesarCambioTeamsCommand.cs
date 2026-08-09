// ============================================================
//  AGENDA MÉDICA — COMANDO: PROCESAR CAMBIO DESDE TEAMS
//  Proyecto : AgendaMedica.Application / Commands
//  Archivo  : ProcesarCambioTeamsCommand.cs
// ============================================================
//  Se dispara cuando el webhook de Microsoft Graph notifica
//  que un evento del calendario fue modificado o eliminado
//  directamente desde Teams u Outlook.
//  Busca la cita por TeamsEventId y actualiza su estado.
// ============================================================

using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Application.Commands;

// ── Comando ───────────────────────────────────────────────────
public record ProcesarCambioTeamsCommand(
    string TeamsEventId,
    string TipoCambio       // "updated" o "deleted"
) : IRequest;

// ── Handler ───────────────────────────────────────────────────
public class ProcesarCambioTeamsHandler
    : IRequestHandler<ProcesarCambioTeamsCommand>
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ProcesarCambioTeamsHandler> _logger;

    public ProcesarCambioTeamsHandler(
        IUnitOfWork uow,
        ILogger<ProcesarCambioTeamsHandler> logger)
    {
        _uow    = uow;
        _logger = logger;
    }

    public async Task Handle(
        ProcesarCambioTeamsCommand request, CancellationToken ct)
    {
        // Buscar la cita asociada al evento de Teams
        var cita = await _uow.Citas
            .ObtenerPorTeamsEventIdAsync(request.TeamsEventId, ct);

        if (cita is null)
        {
            _logger.LogWarning(
                "Webhook Teams: no se encontró cita para TeamsEventId={EventId}",
                request.TeamsEventId);
            return;
        }

        var nuevoEstado = request.TipoCambio switch
        {
            "deleted" => EstadoCita.Cancelada,
            _         => EstadoCita.Reprogramada
        };

        // Solo cambiar si la transición es válida desde el estado actual
        try
        {
            switch (nuevoEstado)
            {
                case EstadoCita.Cancelada:
                    cita.Cancelar(
                        "Cancelada desde Microsoft Teams.",
                        "Teams-Webhook",
                        OrigenCambio.Teams);
                    break;

                case EstadoCita.Reprogramada:
                    // La nueva fecha la trae el evento de Teams;
                    // aquí solo marcamos que fue reprogramada externamente.
                    // La fecha real se actualizará en la próxima sincronización.
                    _logger.LogInformation(
                        "Cita {CitaId} modificada en Teams — pendiente de sincronizar fecha.",
                        cita.Id);
                    break;
            }

            _uow.Citas.Actualizar(cita);
            await _uow.GuardarAsync(ct);

            _logger.LogInformation(
                "Cita {CitaId} actualizada desde Teams: estado={Estado}",
                cita.Id, nuevoEstado);
        }
        catch (Domain.Exceptions.DomainException ex)
        {
            _logger.LogWarning(
                "Webhook Teams: transición inválida para cita {CitaId}: {Msg}",
                cita.Id, ex.Message);
        }
    }
}
