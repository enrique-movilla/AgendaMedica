// ============================================================
//  AGENDA MÉDICA — ADMINISTRACIÓN DE CATÁLOGOS (Fase 1)
//  Proyecto : AgendaMedica.Api / Controllers
//  Archivo  : AdministracionCatalogosController.cs
// ============================================================
//  Controlador genérico: sirve cualquier catálogo registrado en
//  IAdministracionCatalogos mediante su nombre de tabla
//  (GET /v1/admin/catalogos devuelve las definiciones; luego
//  /v1/admin/catalogos/{tabla} opera sobre un catálogo concreto).
//
//  HTTP:
//    GET    /v1/admin/catalogos                       → definiciones
//    GET    /v1/admin/catalogos/{tabla}               → lista paginada
//    GET    /v1/admin/catalogos/{tabla}/{id}          → fila
//    POST   /v1/admin/catalogos/{tabla}               → crear
//    PUT    /v1/admin/catalogos/{tabla}/{id}          → actualizar
//    DELETE /v1/admin/catalogos/{tabla}/{id}          → inactivar (soft)
//    POST   /v1/admin/catalogos/{tabla}/{id}/reactivar→ activar
//    DELETE /v1/admin/catalogos/{tabla}/{id}/permanente → borrar físico
//    GET    /v1/admin/catalogos/{tabla}/{id}/dependencias → dependencias
// ============================================================

using AgendaMedica.Domain;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/admin/catalogos")]
[Produces("application/json")]
public class AdministracionCatalogosController : ControllerBase
{
    private readonly IAdministracionCatalogos _admin;
    public AdministracionCatalogosController(IAdministracionCatalogos admin) => _admin = admin;

    /// <summary>Lista las definiciones (metadata) de los catálogos administrables.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CatalogoDefinicion>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Definiciones(CancellationToken ct)
        => Ok(await _admin.ObtenerDefinicionesAsync(ct));

    /// <summary>Lista paginada de un catálogo, con búsqueda y filtro por padre opcionales.</summary>
    [HttpGet("{tabla}")]
    [ProducesResponseType(typeof(ResultadoCatalogo), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Listar(
        string tabla,
        [FromQuery] string? termino = null,
        [FromQuery] string? filtroPadre = null,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamPagina = 20,
        [FromQuery] bool soloActivos = false,
        CancellationToken ct = default)
        => Ok(await _admin.ListarAsync(tabla, termino, pagina, tamPagina, soloActivos, filtroPadre, ct));

    /// <summary>Obtiene una fila de un catálogo por su Id.</summary>
    [HttpGet("{tabla}/{id}")]
    [ProducesResponseType(typeof(CatalogoFila), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Obtener(string tabla, string id, CancellationToken ct)
        => Ok(await _admin.ObtenerPorIdAsync(tabla, id, ct));

    /// <summary>Crea una fila en un catálogo.</summary>
    [HttpPost("{tabla}")]
    [ProducesResponseType(typeof(CatalogoFila), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Crear(
        string tabla, [FromBody] Dictionary<string, object?> valores, CancellationToken ct)
    {
        var fila = await _admin.CrearAsync(tabla, valores, ct);
        return CreatedAtAction(nameof(Obtener), new { tabla, id = fila.Id }, fila);
    }

    /// <summary>Actualiza una fila existente.</summary>
    [HttpPut("{tabla}/{id}")]
    [ProducesResponseType(typeof(CatalogoFila), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Actualizar(
        string tabla, string id, [FromBody] Dictionary<string, object?> valores, CancellationToken ct)
        => Ok(await _admin.ActualizarAsync(tabla, id, valores, ct));

    /// <summary>Inactiva (soft delete) una fila.</summary>
    [HttpDelete("{tabla}/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(string tabla, string id, CancellationToken ct)
    {
        await _admin.InactivarAsync(tabla, id, ct);
        return NoContent();
    }

    /// <summary>Re-activa una fila inactivada.</summary>
    [HttpPost("{tabla}/{id}/reactivar")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Reactivar(string tabla, string id, CancellationToken ct)
    {
        await _admin.ActivarAsync(tabla, id, ct);
        return NoContent();
    }

    /// <summary>Borra físicamente una fila, validando que no tenga dependencias.</summary>
    [HttpDelete("{tabla}/{id}/permanente")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> BorrarPermanente(string tabla, string id, CancellationToken ct)
    {
        await _admin.BorrarAsync(tabla, id, ct);
        return NoContent();
    }

    /// <summary>Devuelve las dependencias que impiden el borrado de una fila.</summary>
    [HttpGet("{tabla}/{id}/dependencias")]
    [ProducesResponseType(typeof(IReadOnlyList<DependenciaCatalogo>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Dependencias(string tabla, string id, CancellationToken ct)
        => Ok(await _admin.ObtenerDependenciasAsync(tabla, id, ct));
}