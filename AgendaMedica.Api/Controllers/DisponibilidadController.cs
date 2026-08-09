// ============================================================
//  AGENDA MÉDICA — DISPONIBILIDAD PROFESIONAL CONTROLLER
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================
//  CRUD de plantillas horarias (Fase 1 UI/UX).
//  Rutas:
//    GET  v1/disponibilidad?profesionalId=1      → plantillas del profesional
//    POST v1/disponibilidad                       → crear plantilla
//    PUT  v1/disponibilidad/{id}                  → actualizar plantilla
//    DELETE v1/disponibilidad/{id}                → inactivar plantilla
// ============================================================

using AgendaMedica.Application.Commands;
using AgendaMedica.Application.DTOs;
using AgendaMedica.Application.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/[controller]")]
[Produces("application/json")]
public class DisponibilidadController : ControllerBase
{
    private readonly IMediator _mediator;
    public DisponibilidadController(IMediator mediator) => _mediator = mediator;

    // ── GET v1/disponibilidad?profesionalId=1 ─────────────────
    [HttpGet]
    [ProducesResponseType(typeof(List<DisponibilidadProfesionalDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Plantillas(
        [FromQuery] int profesionalId, CancellationToken ct)
    {
        var resultado = await _mediator.Send(
            new ObtenerPlantillasDisponibilidadQuery(profesionalId), ct);
        return Ok(resultado);
    }

    // ── POST v1/disponibilidad ────────────────────────────────
    [HttpPost]
    [ProducesResponseType(typeof(DisponibilidadProfesionalDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Crear(
        [FromBody] CrearDisponibilidadRequest request, CancellationToken ct)
    {
        var command = new CrearDisponibilidadCommand(
            ProfesionalId:   request.ProfesionalId,
            DiaSemana:       request.DiaSemana,
            HoraInicio:      request.HoraInicio,
            HoraFin:         request.HoraFin,
            DuracionMinutos: request.DuracionMinutos,
            SedeId:          request.SedeId,
            ConsultorioSala: request.ConsultorioSala);

        var resultado = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(Plantillas), new { profesionalId = resultado.ProfesionalId },
            resultado);
    }

    // ── PUT v1/disponibilidad/{id} ────────────────────────────
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DisponibilidadProfesionalDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Actualizar(
        int id, [FromBody] ActualizarDisponibilidadRequest request, CancellationToken ct)
    {
        var command = new ActualizarDisponibilidadCommand(
            Id:              id,
            DiaSemana:       request.DiaSemana,
            HoraInicio:      request.HoraInicio,
            HoraFin:         request.HoraFin,
            DuracionMinutos: request.DuracionMinutos,
            SedeId:          request.SedeId,
            ConsultorioSala: request.ConsultorioSala);

        var resultado = await _mediator.Send(command, ct);
        return Ok(resultado);
    }

    // ── DELETE v1/disponibilidad/{id} ─────────────────────────
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(int id, CancellationToken ct)
    {
        var resultado = await _mediator.Send(new InactivarDisponibilidadCommand(id), ct);
        return Ok(new { ok = resultado });
    }
}

// ── Request models ────────────────────────────────────────────
public record CrearDisponibilidadRequest(
    int     ProfesionalId,
    byte    DiaSemana,
    string  HoraInicio,
    string  HoraFin,
    short   DuracionMinutos,
    int?    SedeId       = null,
    string? ConsultorioSala = null
);

public record ActualizarDisponibilidadRequest(
    byte    DiaSemana,
    string  HoraInicio,
    string  HoraFin,
    short   DuracionMinutos,
    int?    SedeId       = null,
    string? ConsultorioSala = null
);