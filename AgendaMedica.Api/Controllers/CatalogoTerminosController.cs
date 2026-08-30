// ============================================================
//  AGENDA MÉDICA — CATÁLOGO DE TÉRMINOS PARAMÉTRICOS POR TENANT Y VERTICAL
//  Proyecto : AgendaMedica.Api / Controllers
//  Archivo  : CatalogoTerminosController.cs
// ============================================================
//  Expone endpoints para gestionar el catálogo de términos
//  paramétricos por tenant y vertical (multitenant).
//
//  HTTP:
//    GET    /v1/tenant/{tenantId}/catalogo?vertical={vertical}           → lista completa
//    GET    /v1/tenant/{tenantId}/catalogo/{clave}?vertical={vertical}   → término por clave
//    GET    /v1/tenant/{tenantId}/catalogo/categoria/{categoria}?vertical={vertical} → por categoría
//    POST   /v1/tenant/{tenantId}/catalogo           → crear término
//    PUT    /v1/tenant/{tenantId}/catalogo/{clave}?vertical={vertical}   → actualizar término
//    DELETE /v1/tenant/{tenantId}/catalogo/{clave}?vertical={vertical}   → inactivar término
//    POST   /v1/tenant/{tenantId}/catalogo/seed      → sembrar por vertical
//    POST   /v1/tenant/{tenantId}/catalogo/seed-all  → sembrar TODAS las verticales
// ============================================================

using AgendaMedica.Application.Commands;
using AgendaMedica.Application.DTOs;
using AgendaMedica.Application.Queries;
using AgendaMedica.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/tenant/{tenantId:int}/catalogo")]
[Produces("application/json")]
public class CatalogoTerminosController : ControllerBase
{
    private readonly IMediator _mediator;
    public CatalogoTerminosController(IMediator mediator) => _mediator = mediator;

    /// <summary>Obtiene todos los términos activos del tenant y vertical.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<CatalogoTerminoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObtenerTodos(int tenantId, [FromQuery] string vertical = "default", CancellationToken ct = default)
        => Ok(await _mediator.Send(new ObtenerCatalogoTerminosQuery(tenantId, vertical), ct));

    /// <summary>Obtiene un término específico por su clave y vertical.</summary>
    [HttpGet("{clave}")]
    [ProducesResponseType(typeof(CatalogoTerminoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObtenerPorClave(int tenantId, ClaveTermino clave, [FromQuery] string vertical = "default", CancellationToken ct = default)
    {
        var termino = await _mediator.Send(new ObtenerTerminoQuery(tenantId, vertical, clave), ct);
        return termino is null ? NotFound() : Ok(termino);
    }

    /// <summary>Obtiene los términos de una categoría específica.</summary>
    [HttpGet("categoria/{categoria}")]
    [ProducesResponseType(typeof(List<CatalogoTerminoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ObtenerPorCategoria(int tenantId, string categoria, [FromQuery] string vertical = "default", CancellationToken ct = default)
        => Ok(await _mediator.Send(new ObtenerTerminosPorCategoriaQuery(tenantId, vertical, categoria), ct));

    /// <summary>Crea un nuevo término para el tenant y vertical.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CatalogoTerminoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Crear(int tenantId, [FromBody] CrearTerminoRequest request, CancellationToken ct)
    {
        var termino = await _mediator.Send(new CrearTerminoCommand(tenantId, request.Vertical, request.Clave, request.Valor, request.Categoria), ct);
        return CreatedAtAction(nameof(ObtenerPorClave), new { tenantId, clave = request.Clave, vertical = request.Vertical }, termino);
    }

    /// <summary>Actualiza un término existente.</summary>
    [HttpPut("{clave}")]
    [ProducesResponseType(typeof(CatalogoTerminoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Actualizar(int tenantId, ClaveTermino clave, [FromQuery] string vertical, [FromBody] ActualizarTerminoRequest request, CancellationToken ct)
    {
        var termino = await _mediator.Send(new ActualizarTerminoCommand(tenantId, vertical, clave, request.Valor, request.Categoria), ct);
        return Ok(termino);
    }

    /// <summary>Inactiva un término (soft delete).</summary>
    [HttpDelete("{clave}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(int tenantId, ClaveTermino clave, [FromQuery] string vertical = "default", CancellationToken ct = default)
    {
        await _mediator.Send(new InactivarTerminoCommand(tenantId, vertical, clave), ct);
        return NoContent();
    }

    /// <summary>Sembrar el catálogo con valores por defecto según vertical de negocio.</summary>
    [HttpPost("seed")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> Seed(int tenantId, [FromBody] SeedCatalogoRequest request, CancellationToken ct)
    {
        var creados = await _mediator.Send(new SeedCatalogoPorDefectoCommand(tenantId, request.Vertical), ct);
        return Ok(new { TenantId = tenantId, Vertical = request.Vertical, TerminosCreados = creados });
    }

    /// <summary>Sembrar TODAS las verticales (default, salud, belleza, servicios, taller).</summary>
    [HttpPost("seed-all")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    public async Task<IActionResult> SeedAll(int tenantId, CancellationToken ct)
    {
        var creados = await _mediator.Send(new SeedTodasVerticalesCommand(tenantId), ct);
        return Ok(new { TenantId = tenantId, Verticales = new[] { "default", "salud", "belleza", "servicios", "taller" }, TerminosCreados = creados });
    }

    // ── Request DTOs ────────────────────────────────────────────
    public record CrearTerminoRequest(string Vertical, ClaveTermino Clave, string Valor, string Categoria);
    public record ActualizarTerminoRequest(string Valor, string Categoria);
    public record SeedCatalogoRequest(string Vertical); // "salud", "belleza", "servicios", "taller", "default"
}