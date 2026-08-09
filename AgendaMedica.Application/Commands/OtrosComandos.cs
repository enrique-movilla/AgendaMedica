// ============================================================
//  AGENDA MÉDICA — OTROS COMANDOS (v1.3 corregido)
//  Proyecto : AgendaMedica.Application / Commands
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Domain.Interfaces;   // ← INotificacionService ahora en Domain
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Application.Commands;

// ══════════════════════════════════════════════════════════════
//  CANCELAR CITA
// ══════════════════════════════════════════════════════════════
public record CancelarCitaCommand(
    int    CitaId,
    string Motivo,
    string CambiadoPor,
    string Origen = "App"
) : IRequest<CitaDto>;

public class CancelarCitaHandler : IRequestHandler<CancelarCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CancelarCitaHandler> _logger;

    public CancelarCitaHandler(
        IUnitOfWork uow,
        INotificacionService notif,
        ILogger<CancelarCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notif;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        CancelarCitaCommand request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        var origenEnum = Enum.Parse<OrigenCambio>(request.Origen, ignoreCase: true);
        cita.Cancelar(request.Motivo, request.CambiadoPor, origenEnum);

        _uow.Citas.Actualizar(cita);
        await _uow.GuardarAsync(ct);

        if (cita.Paciente is not null)
        {
            try { await _notificaciones.NotificarCancelacionCitaAsync(cita, request.Motivo, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Notif cancelación falló cita {Id}", cita.Id); }
        }

        return cita.ToDto();
    }
}

// ══════════════════════════════════════════════════════════════
//  MODIFICAR CITA
// ══════════════════════════════════════════════════════════════
public record ModificarCitaCommand(
    int       CitaId,
    DateTime? NuevaFechaHora,
    string?   Observaciones,
    string    Motivo,
    string    ModificadoPor
) : IRequest<CitaDto>;

public class ModificarCitaHandler : IRequestHandler<ModificarCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<ModificarCitaHandler> _logger;

    public ModificarCitaHandler(
        IUnitOfWork uow,
        INotificacionService notif,
        ILogger<ModificarCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notif;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        ModificarCitaCommand request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        var reprogramada = false;

        if (request.NuevaFechaHora.HasValue)
        {
            var tipoCita = await _uow.TiposCita.ObtenerPorIdAsync(cita.TipoCitaId, ct)
                ?? throw new EntidadNoEncontradaException("TipoCita", cita.TipoCitaId);

            var nuevaFin = request.NuevaFechaHora.Value.AddMinutes(tipoCita.DuracionMinutos);

            var hayTraslape = await _uow.Citas.ExisteTraslapeAsync(
                cita.ProfesionalId, request.NuevaFechaHora.Value,
                nuevaFin, citaIdExcluir: cita.Id, ct);

            if (hayTraslape)
                throw new ConflictoHorarioException(request.NuevaFechaHora.Value, nuevaFin);

            cita.Reprogramar(request.NuevaFechaHora.Value,
                tipoCita.DuracionMinutos, request.Motivo, request.ModificadoPor);
            reprogramada = true;
        }

        if (request.Observaciones is not null)
            cita.ActualizarObservaciones(request.Observaciones, request.ModificadoPor);

        _uow.Citas.Actualizar(cita);
        await _uow.GuardarAsync(ct);

        if (reprogramada && cita.Paciente is not null)
        {
            try { await _notificaciones.NotificarReprogramacionCitaAsync(cita, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Notif reprog falló cita {Id}", cita.Id); }
        }

        return cita.ToDto();
    }
}

// ══════════════════════════════════════════════════════════════
//  CAMBIAR ESTADO DE CITA
// ══════════════════════════════════════════════════════════════
public record CambiarEstadoCitaCommand(
    int     CitaId,
    byte    NuevoEstadoId,
    string? Motivo,
    string  CambiadoPor,
    string  Origen = "App"
) : IRequest<CitaDto>;

public class CambiarEstadoCitaHandler
    : IRequestHandler<CambiarEstadoCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CambiarEstadoCitaHandler> _logger;

    public CambiarEstadoCitaHandler(
        IUnitOfWork uow,
        INotificacionService notif,
        ILogger<CambiarEstadoCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notif;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        CambiarEstadoCitaCommand request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        var nuevoEstado = (EstadoCita)request.NuevoEstadoId;
        var origenEnum  = Enum.Parse<OrigenCambio>(request.Origen, ignoreCase: true);

        switch (nuevoEstado)
        {
            case EstadoCita.Confirmada:
                cita.Confirmar(request.CambiadoPor, origenEnum); break;
            case EstadoCita.EnAtencion:
                cita.IniciarAtencion(request.CambiadoPor); break;
            case EstadoCita.Realizada:
                cita.MarcarRealizada(request.CambiadoPor); break;
            case EstadoCita.NoAsistio:
                cita.MarcarNoAsistio(request.CambiadoPor); break;
            case EstadoCita.Cancelada:
                cita.Cancelar(request.Motivo ?? "Cancelada por el sistema",
                    request.CambiadoPor, origenEnum); break;
            default:
                throw new DomainException(
                    $"Use el comando específico para el estado '{nuevoEstado}'.");
        }

        _uow.Citas.Actualizar(cita);
        await _uow.GuardarAsync(ct);

        if (cita.Paciente is not null)
        {
            try
            {
                switch (nuevoEstado)
                {
                    case EstadoCita.Confirmada:
                        await _notificaciones.NotificarConfirmacionCitaAsync(cita, ct); break;
                    case EstadoCita.Cancelada:
                        await _notificaciones.NotificarCancelacionCitaAsync(
                            cita, request.Motivo ?? string.Empty, ct); break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notif estado falló cita {Id}", cita.Id);
            }
        }

        return cita.ToDto();
    }
}
