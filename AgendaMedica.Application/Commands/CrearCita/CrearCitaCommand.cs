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
    string   CreadoPor
) : IRequest<CitaDto>;

public class CrearCitaHandler : IRequestHandler<CrearCitaCommand, CitaDto>
{
    private readonly IUnitOfWork          _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CrearCitaHandler> _logger;

    public CrearCitaHandler(
        IUnitOfWork uow,
        INotificacionService notificaciones,
        ILogger<CrearCitaHandler> logger)
    {
        _uow            = uow;
        _notificaciones = notificaciones;
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

        var fechaHoraFin = request.FechaHora.AddMinutes(tipoCita.DuracionMinutos);
        var hayTraslape  = await _uow.Citas.ExisteTraslapeAsync(
            request.ProfesionalId, request.FechaHora, fechaHoraFin, null, ct);

        if (hayTraslape)
            throw new ConflictoHorarioException(request.FechaHora, fechaHoraFin);

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

        await _uow.Citas.AgregarAsync(cita, ct);
        await _uow.GuardarAsync(ct);

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
