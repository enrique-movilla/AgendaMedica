// ============================================================
//  AGENDA MÉDICA — CREAR CITA COMMAND (v1.3 corregido)
//  Proyecto : AgendaMedica.Application / Commands / CrearCita
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Domain.Interfaces;   // ← INotificacionService ahora en Domain
using MediatR;
using Microsoft.Extensions.Logging;

namespace AgendaMedica.Application.Commands.CrearCita;

public record CrearCitaCommand(
    DateTime FechaHora,
    int      PacienteId,
    int      ProfesionalId,
    int      TipoCitaId,
    int?     AseguradoraId,
    byte?    TipoUsuarioId,
    string?  MotivoConsulta,
    string?  Observaciones,
    string   CreadoPor,
    string?  BloqueoId = null
) : IRequest<CitaDto>;

public class CrearCitaHandler : IRequestHandler<CrearCitaCommand, CitaDto>
{
    private readonly IUnitOfWork            _uow;
    private readonly INotificacionService   _notificaciones;
    private readonly IBloqueoTurnoServicio  _bloqueos;
    private readonly ILogger<CrearCitaHandler> _logger;

    public CrearCitaHandler(
        IUnitOfWork uow,
        INotificacionService notificaciones,
        IBloqueoTurnoServicio bloqueos,
        ILogger<CrearCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notificaciones;
        _bloqueos       = bloqueos;
        _logger         = logger;
    }

    public async Task<CitaDto> Handle(
        CrearCitaCommand request, CancellationToken ct)
    {
        var paciente = await _uow.Pacientes.ObtenerPorIdAsync(request.PacienteId, ct)
            ?? throw new EntidadNoEncontradaException("Paciente", request.PacienteId);

        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var tipoCita = await _uow.TiposCita.ObtenerPorIdAsync(request.TipoCitaId, ct)
            ?? throw new EntidadNoEncontradaException("TipoCita", request.TipoCitaId);

        var aseguradoraId = request.AseguradoraId ?? paciente.AseguradoraId;
        var tipoUsuarioId = request.TipoUsuarioId ?? paciente.TipoUsuarioId;

        // El bloqueo preventivo (si se envió) debe ser el del turno exacto.
        if (!string.IsNullOrEmpty(request.BloqueoId))
        {
            var fecha  = DateOnly.FromDateTime(request.FechaHora);
            var hora   = request.FechaHora.ToString("HH:mm");
            var valido = await _bloqueos.EsValidoAsync(
                request.ProfesionalId, fecha, hora, request.BloqueoId, ct);

            if (!valido)
                throw new DomainException(
                    "El turno seleccionado ya no está reservado. Vuelva a seleccionarlo.");
        }

        var fechaHoraFin = request.FechaHora.AddMinutes(tipoCita.DuracionMinutos);

        var cita = Cita.Crear(
            fechaHora:       request.FechaHora,
            pacienteId:      request.PacienteId,
            profesionalId:   request.ProfesionalId,
            tipoCitaId:      request.TipoCitaId,
            duracionMinutos: tipoCita.DuracionMinutos,
            creadoPor:       request.CreadoPor,
            aseguradoraId:   aseguradoraId,
            tipoUsuarioId:   tipoUsuarioId,
            motivoConsulta:  request.MotivoConsulta,
            observaciones:   request.Observaciones
        );

        // Insert ATOMICO: advisory lock del profesional + re-chequeo
        // de traslape en la misma transacción (evita doble reserva).
        var creada = await _uow.Citas.CrearCitaAtomicoAsync(
            cita, request.FechaHora, fechaHoraFin, ct);

        if (!creada)
            throw new ConflictoHorarioException(request.FechaHora, fechaHoraFin);

        // El turno ya quedó ocupado: liberar el bloqueo preventivo.
        if (!string.IsNullOrEmpty(request.BloqueoId))
            await _bloqueos.LiberarAsync(request.BloqueoId, ct);

        var citaCompleta = await _uow.Citas.ObtenerPorIdAsync(cita.Id, ct);

        if (citaCompleta?.Paciente is not null)
        {
            try
            {
                await _notificaciones.NotificarCreacionCitaAsync(citaCompleta, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Notificación de creación falló para cita {CitaId}", cita.Id);
            }
        }

        return cita.ToDto(paciente, profesional, tipoCita);
    }
}
