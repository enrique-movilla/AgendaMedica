// ============================================================
//  AGENDA MÉDICA — EXCEPCIONES HORARIAS CONTROLLER
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================
//  CRUD de excepciones horarias (Fase 3 UI/UX):
//  días puntuales en que el profesional atiende con un
//  horario distinto al de su plantilla semanal.
//  Rutas:
//    GET    v1/excepciones-horarias?profesionalId=1 → excepciones del profesional
//    POST   v1/excepciones-horarias                  → crear excepción
//    DELETE v1/excepciones-horarias/{id}             → inactivar excepción
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
public class ExcepcionesHorariasController : ControllerBase
{
    private readonly IMediator _mediator;
    public ExcepcionesHorariasController(IMediator mediator) => _mediator = mediator;

    // ── GET v1/excepciones-horarias?profesionalId=1 ───────────
    [HttpGet]
    [ProducesResponseType(typeof(List<ExcepcionHorariaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(
        [FromQuery] int profesionalId, CancellationToken ct)
    {
        var resultado = await _mediator.Send(
            new ObtenerExcepcionesHorariasQuery(profesionalId), ct);
        return Ok(resultado);
    }

    // ── POST v1/excepciones-horarias ──────────────────────────
    [HttpPost]
    [ProducesResponseType(typeof(ExcepcionHorariaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Crear(
        [FromBody] CrearExcepcionHorariaRequest request, CancellationToken ct)
    {
        var command = new CrearExcepcionHorariaCommand(
            ProfesionalId: request.ProfesionalId,
            Fecha:         request.Fecha,
            HoraInicio:    request.HoraInicio,
            HoraFin:       request.HoraFin);

        var resultado = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(Listar),
            new { profesionalId = resultado.ProfesionalId }, resultado);
    }

    // ── DELETE v1/excepciones-horarias/{id} ───────────────────
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(int id, CancellationToken ct)
    {
        var resultado = await _mediator.Send(new InactivarExcepcionHorariaCommand(id), ct);
        return Ok(new { ok = resultado });
    }
}

// ── Request models ────────────────────────────────────────────
public record CrearExcepcionHorariaRequest(
    int      ProfesionalId,
    DateOnly Fecha,
    string   HoraInicio,
    string   HoraFin
);