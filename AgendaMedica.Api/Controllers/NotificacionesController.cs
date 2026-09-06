// ============================================================
//  AGENDA MÉDICA — NOTIFICACIONES CONTROLLER
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================
//  Rutas:
//    POST v1/notificaciones/recordatorios/disparar → ronda manual
//    GET  v1/notificaciones/log                      → log de envíos
//  NOTA: sin autenticación en la app (igual que el resto de la
//  API); al agregar seguridad, proteger estos endpoints.
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
public class NotificacionesController : ControllerBase
{
    private readonly IMediator _mediator;
    public NotificacionesController(IMediator mediator) => _mediator = mediator;

    // ── POST v1/notificaciones/recordatorios/disparar ──────────
    // Dispara una ronda de recordatorios sin esperar al job horario.
    [HttpPost("recordatorios/disparar")]
    [ProducesResponseType(typeof(DispararRecordatoriosResultado), StatusCodes.Status200OK)]
    public async Task<IActionResult> DispararRecordatorios(CancellationToken ct)
        => Ok(await _mediator.Send(new DispararRecordatoriosCommand(), ct));

    // ── GET v1/notificaciones/log ─────────────────────────────
    [HttpGet("log")]
    [ProducesResponseType(typeof(List<NotificacionLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Log(
        [FromQuery] int? citaId,
        [FromQuery] string? canal,
        [FromQuery] string? estado,
        [FromQuery] int tamPagina = 50,
        CancellationToken ct = default)
        => Ok(await _mediator.Send(
            new ObtenerLogNotificacionesQuery(citaId, canal, estado, tamPagina), ct));
}
