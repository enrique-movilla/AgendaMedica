// ============================================================
//  AGENDA MÉDICA — CITAS CONTROLLER (v1.1)
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================

using AgendaMedica.Application.Commands;
using AgendaMedica.Application.Commands.CrearCita;
using AgendaMedica.Application.DTOs;
using AgendaMedica.Application.Queries;
using AgendaMedica.Domain.Interfaces;
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
            CreadoPor:      ObtenerUsuario(),
            BloqueoId:      request.BloqueoId        // ← Fase 3
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

    // ── GET v1/citas/agenda-rango (Fase 2: semanal/mensual/lista) ─
    [HttpGet("agenda-rango")]
    [ProducesResponseType(typeof(List<AgendaDiaItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AgendaRango(
        [FromQuery] string profesionalesIds,
        [FromQuery] string fechaDesde,
        [FromQuery] string fechaHasta,
        CancellationToken  ct)
    {
        var ids = (profesionalesIds ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(s => int.TryParse(s.Trim(), out var i) ? i : -1)
            .Where(i => i > 0)
            .Distinct()
            .ToArray();

        if (ids.Length == 0)
            return BadRequest(new { codigo = "PROFESIONALES_INVALIDOS",
                                    mensaje = "Indique al menos un profesionalId." });

        if (!DateOnly.TryParse(fechaDesde, out var desde) ||
            !DateOnly.TryParse(fechaHasta, out var hasta))
            return BadRequest(new { codigo = "FECHA_INVALIDA",
                                    mensaje = "El formato de fechas debe ser yyyy-MM-dd." });

        var resultado = await _mediator.Send(
            new ObtenerAgendaRangoQuery(ids, desde, hasta), ct);
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

    // ── POST v1/citas/bloqueos (Fase 3: reserva preventiva 5 min) ─
    [HttpPost("bloqueos")]
    [ProducesResponseType(typeof(ResultadoReservaBloqueo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ReservarBloqueo(
        [FromBody] ReservarBloqueoRequest request, CancellationToken ct)
    {
        var resultado = await _mediator.Send(new ReservarBloqueoCommand(
            ProfesionalId: request.ProfesionalId,
            Fecha:         request.Fecha,
            HoraInicio:    request.HoraInicio,
            Usuario:       ObtenerUsuario()
        ), ct);

        if (!resultado.Exitoso)
            return Conflict(new { codigo = "TURNO_BLOQUEADO",
                                  mensaje = resultado.MotivoRechazo });

        return Ok(resultado);
    }

    // ── PUT v1/citas/bloqueos/{id} (renovar otros 5 min) ───────
    [HttpPut("bloqueos/{bloqueoId}")]
    [ProducesResponseType(typeof(ResultadoReservaBloqueo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RenovarBloqueo(
        string bloqueoId, CancellationToken ct)
    {
        var resultado = await _mediator.Send(
            new RenovarBloqueoCommand(bloqueoId), ct);

        if (!resultado.Exitoso)
            return NotFound(new { codigo = "BLOQUEO_NO_ENCONTRADO",
                                  mensaje = resultado.MotivoRechazo });

        return Ok(resultado);
    }

    // ── DELETE v1/citas/bloqueos/{id} (liberar) ────────────────
    [HttpDelete("bloqueos/{bloqueoId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LiberarBloqueo(
        string bloqueoId, CancellationToken ct)
    {
        await _mediator.Send(new LiberarBloqueoCommand(bloqueoId), ct);
        return NoContent();
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
    string?  Observaciones,
    string?  BloqueoId = null  // ← Fase 3: token de bloqueo preventivo
);

public record ReservarBloqueoRequest(
    int      ProfesionalId,
    DateOnly Fecha,
    string   HoraInicio
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
