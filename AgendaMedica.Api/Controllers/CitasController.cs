// ============================================================
//  AGENDA MÉDICA — CITAS CONTROLLER (v1.1)
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================

using AgendaMedica.Application.Commands;
using AgendaMedica.Application.Commands.CrearCita;
using AgendaMedica.Application.DTOs;
using AgendaMedica.Application.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/[controller]")]
[Produces("application/json")]
public class CitasController : ControllerBase
{
    private readonly IMediator _mediator;
    public CitasController(IMediator mediator) => _mediator = mediator;

    // ── GET v1/citas/{id} ─────────────────────────────────────
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CitaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObtenerCita(int id, CancellationToken ct)
    {
        var resultado = await _mediator.Send(new ObtenerCitaQuery(id), ct);
        return Ok(resultado);
    }

    // ── POST v1/citas ─────────────────────────────────────────
    [HttpPost]
    [ProducesResponseType(typeof(CitaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CrearCita(
        [FromBody] CrearCitaRequest request, CancellationToken ct)
    {
        var command = new CrearCitaCommand(
            FechaHora:      request.FechaHora,
            PacienteId:     request.PacienteId,
            ProfesionalId:  request.ProfesionalId,
            TipoCitaId:     request.TipoCitaId,
            AseguradoraId:  request.AseguradoraId,   // ← v1.1
            TipoUsuarioId:  request.TipoUsuarioId,   // ← v1.1
            MotivoConsulta: request.MotivoConsulta,
            Observaciones:  request.Observaciones,
            CreadoPor:      ObtenerUsuario()
        );

        var resultado = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(ObtenerCita), new { id = resultado.Id }, resultado);
    }

    // ── PUT v1/citas/{id} ─────────────────────────────────────
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(CitaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ModificarCita(
        int id, [FromBody] ModificarCitaRequest request, CancellationToken ct)
    {
        var command = new ModificarCitaCommand(
            CitaId:         id,
            NuevaFechaHora: request.NuevaFechaHora,
            Observaciones:  request.Observaciones,
            Motivo:         request.Motivo ?? string.Empty,
            ModificadoPor:  ObtenerUsuario()
        );
        var resultado = await _mediator.Send(command, ct);
        return Ok(resultado);
    }

    // ── PATCH v1/citas/{id}/estado ────────────────────────────
    [HttpPatch("{id:int}/estado")]
    [ProducesResponseType(typeof(CitaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CambiarEstado(
        int id, [FromBody] CambiarEstadoRequest request, CancellationToken ct)
    {
        var command = new CambiarEstadoCitaCommand(
            CitaId:        id,
            NuevoEstadoId: request.NuevoEstadoId,
            Motivo:        request.Motivo,
            CambiadoPor:   ObtenerUsuario()
        );
        var resultado = await _mediator.Send(command, ct);
        return Ok(resultado);
    }

    // ── POST v1/citas/{id}/cancelar ───────────────────────────
    [HttpPost("{id:int}/cancelar")]
    [ProducesResponseType(typeof(CitaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelarCita(
        int id, [FromBody] CancelarCitaRequest request, CancellationToken ct)
    {
        var command = new CancelarCitaCommand(
            CitaId:      id,
            Motivo:      request.Motivo,
            CambiadoPor: ObtenerUsuario()
        );
        var resultado = await _mediator.Send(command, ct);
        return Ok(resultado);
    }

    // ── GET v1/citas/{id}/historial ───────────────────────────
    [HttpGet("{id:int}/historial")]
    [ProducesResponseType(typeof(List<HistorialEstadoDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObtenerHistorial(int id, CancellationToken ct)
    {
        var resultado = await _mediator.Send(new ObtenerHistorialCitaQuery(id), ct);
        return Ok(resultado);
    }

    // ── GET v1/citas/agenda-dia ───────────────────────────────
    [HttpGet("agenda-dia")]
    [ProducesResponseType(typeof(List<AgendaDiaItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AgendaDia(
        [FromQuery] int    profesionalId,
        [FromQuery] string fecha,
        CancellationToken  ct)
    {
        if (!DateOnly.TryParse(fecha, out var fechaParsed))
            return BadRequest(new { codigo = "FECHA_INVALIDA",
                                    mensaje = "El formato de fecha debe ser yyyy-MM-dd." });

        var resultado = await _mediator.Send(
            new ObtenerAgendaDiaQuery(profesionalId, fechaParsed), ct);
        return Ok(resultado);
    }

    // ── GET v1/citas/disponibilidad ───────────────────────────
    [HttpGet("disponibilidad")]
    [ProducesResponseType(typeof(DisponibilidadDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Disponibilidad(
        [FromQuery] int    profesionalId,
        [FromQuery] string fecha,
        [FromQuery] int    tipoCitaId,
        CancellationToken  ct)
    {
        if (!DateOnly.TryParse(fecha, out var fechaParsed))
            return BadRequest(new { codigo = "FECHA_INVALIDA",
                                    mensaje = "El formato de fecha debe ser yyyy-MM-dd." });

        var resultado = await _mediator.Send(
            new ObtenerDisponibilidadQuery(profesionalId, fechaParsed, tipoCitaId), ct);
        return Ok(resultado);
    }

    private string ObtenerUsuario()
        => HttpContext.User.Identity?.Name ?? "dev-user";
}

// ── Request models ────────────────────────────────────────────
public record CrearCitaRequest(
    DateTime FechaHora,
    int      PacienteId,
    int      ProfesionalId,
    int      TipoCitaId,
    int?     AseguradoraId,    // ← v1.1: null = tomar del paciente
    byte?    TipoUsuarioId,    // ← v1.1: null = tomar del paciente
    string?  MotivoConsulta,
    string?  Observaciones
);

public record ModificarCitaRequest(
    DateTime? NuevaFechaHora,
    string?   Observaciones,
    string?   Motivo
);

public record CambiarEstadoRequest(
    byte    NuevoEstadoId,
    string? Motivo
);

public record CancelarCitaRequest(
    string Motivo
);
