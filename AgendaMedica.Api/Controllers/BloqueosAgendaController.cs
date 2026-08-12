// ============================================================
//  AGENDA MÉDICA — BLOQUEOS DE AGENDA CONTROLLER
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================
//  CRUD de bloqueos de agenda (Fase 3 UI/UX):
//  vacaciones, congresos, descansos o franjas bloqueadas.
//  Rutas:
//    GET    v1/bloqueos?profesionalId=1   → bloqueos del profesional
//    POST   v1/bloqueos                    → crear bloqueo
//    DELETE v1/bloqueos/{id}               → inactivar bloqueo
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
public class BloqueosAgendaController : ControllerBase
{
    private readonly IMediator _mediator;
    public BloqueosAgendaController(IMediator mediator) => _mediator = mediator;

    // ── GET v1/bloqueos?profesionalId=1 ───────────────────────
    [HttpGet]
    [ProducesResponseType(typeof(List<BloqueoAgendaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(
        [FromQuery] int profesionalId, CancellationToken ct)
    {
        var resultado = await _mediator.Send(
            new ObtenerBloqueosAgendaQuery(profesionalId), ct);
        return Ok(resultado);
    }

    // ── POST v1/bloqueos ──────────────────────────────────────
    [HttpPost]
    [ProducesResponseType(typeof(BloqueoAgendaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Crear(
        [FromBody] CrearBloqueoAgendaRequest request, CancellationToken ct)
    {
        var command = new CrearBloqueoAgendaCommand(
            ProfesionalId: request.ProfesionalId,
            FechaDesde:    request.FechaDesde,
            FechaHasta:    request.FechaHasta,
            HoraInicio:    request.HoraInicio,
            HoraFin:       request.HoraFin,
            Motivo:        request.Motivo);

        var resultado = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(Listar),
            new { profesionalId = resultado.ProfesionalId }, resultado);
    }

    // ── DELETE v1/bloqueos/{id} ───────────────────────────────
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(int id, CancellationToken ct)
    {
        var resultado = await _mediator.Send(new InactivarBloqueoAgendaCommand(id), ct);
        return Ok(new { ok = resultado });
    }
}

// ── Request models ────────────────────────────────────────────
public record CrearBloqueoAgendaRequest(
    int      ProfesionalId,
    DateOnly FechaDesde,
    DateOnly FechaHasta,
    string   Motivo,
    string?  HoraInicio = null,
    string?  HoraFin    = null
);
