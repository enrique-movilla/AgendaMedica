// ============================================================
//  AGENDA MÉDICA — OTROS COMANDOS (v1.3 corregido)
//  Proyecto : AgendaMedica.Application / Commands
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Domain.Entities;
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

            cita.Reprogramar(request.NuevaFechaHora.Value,
                tipoCita.DuracionMinutos, request.Motivo, request.ModificadoPor);
            reprogramada = true;

            // Validación ATOMICA de traslape: advisory lock en BD.
            var ok = await _uow.Citas.ModificarCitaAtomicoAsync(
                cita, request.NuevaFechaHora.Value, nuevaFin, ct);

            if (!ok)
                throw new ConflictoHorarioException(request.NuevaFechaHora.Value, nuevaFin);
        }

        if (request.Observaciones is not null)
        {
            cita.ActualizarObservaciones(request.Observaciones, request.ModificadoPor);
            await _uow.GuardarAsync(ct);
        }
        else if (!reprogramada)
        {
            await _uow.GuardarAsync(ct);
        }

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

// ══════════════════════════════════════════════════════════════
//  DISPONIBILIDAD PROFESIONAL (plantillas horarias) — Fase 1
// ══════════════════════════════════════════════════════════════
public record CrearDisponibilidadCommand(
    int      ProfesionalId,
    byte     DiaSemana,
    string   HoraInicio,
    string   HoraFin,
    short    DuracionMinutos,
    int?     SedeId,
    string?  ConsultorioSala
) : IRequest<DisponibilidadProfesionalDto>;

public class CrearDisponibilidadHandler
    : IRequestHandler<CrearDisponibilidadCommand, DisponibilidadProfesionalDto>
{
    private readonly IUnitOfWork _uow;
    public CrearDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<DisponibilidadProfesionalDto> Handle(
        CrearDisponibilidadCommand request, CancellationToken ct)
    {
        if (request.DiaSemana is < 1 or > 7)
            throw new DomainException("El día de la semana debe estar entre 1 (lunes) y 7 (domingo).");

        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var entidad = new DisponibilidadProfesional(
            profesionalId: request.ProfesionalId,
            d: (DiaSemana)request.DiaSemana,
            horaInicio: TimeOnly.Parse(request.HoraInicio),
            horaFin: TimeOnly.Parse(request.HoraFin),
            duracionMinutos: request.DuracionMinutos,
            sedeId: request.SedeId,
            consultorioSala: request.ConsultorioSala);

        await _uow.Disponibilidades.AgregarAsync(entidad, ct);
        await _uow.GuardarAsync(ct);
        return entidad.ToDisponibilidadDto();
    }
}

public record ActualizarDisponibilidadCommand(
    int      Id,
    byte     DiaSemana,
    string   HoraInicio,
    string   HoraFin,
    short    DuracionMinutos,
    int?     SedeId,
    string?  ConsultorioSala
) : IRequest<DisponibilidadProfesionalDto>;

public class ActualizarDisponibilidadHandler
    : IRequestHandler<ActualizarDisponibilidadCommand, DisponibilidadProfesionalDto>
{
    private readonly IUnitOfWork _uow;
    public ActualizarDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<DisponibilidadProfesionalDto> Handle(
        ActualizarDisponibilidadCommand request, CancellationToken ct)
    {
        if (request.DiaSemana is < 1 or > 7)
            throw new DomainException("El día de la semana debe estar entre 1 (lunes) y 7 (domingo).");

        var entidad = await _uow.Disponibilidades.ObtenerPorIdAsync(request.Id, ct)
            ?? throw new EntidadNoEncontradaException("DisponibilidadPeriodo", request.Id);

        entidad.Actualizar(
            d: (DiaSemana)request.DiaSemana,
            horaInicio: TimeOnly.Parse(request.HoraInicio),
            horaFin: TimeOnly.Parse(request.HoraFin),
            duracionMinutos: request.DuracionMinutos,
            sedeId: request.SedeId,
            consultorioSala: request.ConsultorioSala);

        _uow.Disponibilidades.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return entidad.ToDisponibilidadDto();
    }
}

public record InactivarDisponibilidadCommand(int Id) : IRequest<bool>;

public class InactivarDisponibilidadHandler
    : IRequestHandler<InactivarDisponibilidadCommand, bool>
{
    private readonly IUnitOfWork _uow;
    public InactivarDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<bool> Handle(
        InactivarDisponibilidadCommand request, CancellationToken ct)
    {
        var entidad = await _uow.Disponibilidades.ObtenerPorIdAsync(request.Id, ct)
            ?? throw new EntidadNoEncontradaException("DisponibilidadPeriodo", request.Id);

        entidad.Inactivar();
        _uow.Disponibilidades.Actualizar(entidad);
        await _uow.GuardarAsync(ct);
        return true;
    }
}

// ══════════════════════════════════════════════════════════════
//  BLOQUEO PREVENTIVO DE TURNOS (Fase 3)
// ══════════════════════════════════════════════════════════════
public record ReservarBloqueoCommand(
    int    ProfesionalId,
    DateOnly Fecha,
    string HoraInicio,
    string Usuario
) : IRequest<ResultadoReservaBloqueo>;

public class ReservarBloqueoHandler
    : IRequestHandler<ReservarBloqueoCommand, ResultadoReservaBloqueo>
{
    private readonly IBloqueoTurnoServicio _bloqueos;
    public ReservarBloqueoHandler(IBloqueoTurnoServicio bloqueos) => _bloqueos = bloqueos;

    public Task<ResultadoReservaBloqueo> Handle(
        ReservarBloqueoCommand request, CancellationToken ct)
        => _bloqueos.ReservarAsync(
            request.ProfesionalId, request.Fecha, request.HoraInicio,
            request.Usuario, ct);
}

public record RenovarBloqueoCommand(string BloqueoId)
    : IRequest<ResultadoReservaBloqueo>;

public class RenovarBloqueoHandler
    : IRequestHandler<RenovarBloqueoCommand, ResultadoReservaBloqueo>
{
    private readonly IBloqueoTurnoServicio _bloqueos;
    public RenovarBloqueoHandler(IBloqueoTurnoServicio bloqueos) => _bloqueos = bloqueos;

    public Task<ResultadoReservaBloqueo> Handle(
        RenovarBloqueoCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.BloqueoId))
            throw new EntidadNoEncontradaException("Bloqueo de turno", string.Empty);

        return _bloqueos.RenovarAsync(request.BloqueoId, ct);
    }
}

public record LiberarBloqueoCommand(string BloqueoId) : IRequest<bool>;

public class LiberarBloqueoHandler
    : IRequestHandler<LiberarBloqueoCommand, bool>
{
    private readonly IBloqueoTurnoServicio _bloqueos;
    public LiberarBloqueoHandler(IBloqueoTurnoServicio bloqueos) => _bloqueos = bloqueos;

    public Task<bool> Handle(
        LiberarBloqueoCommand request, CancellationToken ct)
        => _bloqueos.LiberarAsync(request.BloqueoId, ct);
}
