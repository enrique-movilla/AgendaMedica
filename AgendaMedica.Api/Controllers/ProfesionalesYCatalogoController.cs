// ============================================================
//  AGENDA MÉDICA — PROFESIONALES + CATÁLOGO CONTROLLERS (v1.1)
//  Proyecto : AgendaMedica.Api / Controllers
//  Archivo  : ProfesionalesYCatalogoController.cs
// ============================================================

using AgendaMedica.Application.DTOs;       // ← TipoEntidadDto, TipoUsuarioDto, DepartamentoDto, MunicipioDto
using AgendaMedica.Domain;
using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

// ══════════════════════════════════════════════════════════════
//  PROFESIONALES CONTROLLER
// ══════════════════════════════════════════════════════════════
[ApiController]
[Route("v1/[controller]")]
[Produces("application/json")]
public class ProfesionalesController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public ProfesionalesController(IUnitOfWork uow) => _uow = uow;

    [HttpGet]
    [ProducesResponseType(typeof(List<ProfesionalResumenDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(
        [FromQuery] int? especialidadId = null,
        [FromQuery] int? sedeId = null,
        CancellationToken ct = default)
    {
        IList<Profesional> profesionales;

        if (especialidadId.HasValue)
            profesionales = await _uow.Profesionales.ObtenerPorEspecialidadAsync(especialidadId.Value, ct);
        else if (sedeId.HasValue)
            profesionales = await _uow.Profesionales.ObtenerPorSedeAsync(sedeId.Value, ct);
        else
            profesionales = await _uow.Profesionales.ObtenerTodosAsync(ct);

        return Ok(profesionales.Select(p => p.ToResumenDto()).ToList());
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ProfesionalResumenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(id, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", id);
        return Ok(profesional.ToResumenDto());
    }

    [HttpPost]
    [ProducesResponseType(typeof(ProfesionalResumenDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Crear(
        [FromBody] CrearProfesionalRequest request, CancellationToken ct)
    {
        var existe = await _uow.Profesionales.ExisteIdentificacionAsync(
            request.TipoIdentificacionId, request.NumeroIdentificacion, ct: ct);

        if (existe)
            throw new EntidadDuplicadaException("profesional",
                $"{request.TipoIdentificacionId} {request.NumeroIdentificacion}");

        var profesional = new Profesional(
            tipoIdentificacionId: request.TipoIdentificacionId,
            numeroIdentificacion: request.NumeroIdentificacion,
            nombresCompletos: request.NombresCompletos,
            especialidadId: request.EspecialidadId,
            sedeId: request.SedeId,
            celular: request.Celular,
            email: request.Email,
            consultorioSala: request.ConsultorioSala,
            registroMedico: request.RegistroMedico);

        await _uow.Profesionales.AgregarAsync(profesional, ct);
        await _uow.GuardarAsync(ct);

        return CreatedAtAction(nameof(ObtenerPorId), new { id = profesional.Id },
            profesional.ToResumenDto());
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ProfesionalResumenDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Actualizar(
        int id, [FromBody] ActualizarProfesionalRequest request, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(id, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", id);

        profesional.ActualizarDatos(request.NombresCompletos, request.EspecialidadId,
            request.SedeId, request.Celular, request.Email,
            request.ConsultorioSala, request.RegistroMedico);

        _uow.Profesionales.Actualizar(profesional);
        await _uow.GuardarAsync(ct);
        return Ok(profesional.ToResumenDto());
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(int id, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(id, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", id);
        profesional.Inactivar();
        _uow.Profesionales.Actualizar(profesional);
        await _uow.GuardarAsync(ct);
        return NoContent();
    }
}

// ── Request models de Profesional ────────────────────────────
public record CrearProfesionalRequest(
    byte TipoIdentificacionId,
    string NumeroIdentificacion,
    string NombresCompletos,
    int EspecialidadId,
    int SedeId,
    string? Celular,
    string? Email,
    string? ConsultorioSala,
    string? RegistroMedico);

public record ActualizarProfesionalRequest(
    string NombresCompletos,
    int EspecialidadId,
    int SedeId,
    string? Celular,
    string? Email,
    string? ConsultorioSala,
    string? RegistroMedico);

// ══════════════════════════════════════════════════════════════
//  CATÁLOGO CONTROLLER
// ══════════════════════════════════════════════════════════════
[ApiController]
[Route("v1/[controller]")]
[Produces("application/json")]
public class CatalogoController : ControllerBase
{
    private readonly IUnitOfWork _uow;
    public CatalogoController(IUnitOfWork uow) => _uow = uow;

    [HttpGet("especialidades")]
    [ProducesResponseType(typeof(List<EspecialidadDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Especialidades(CancellationToken ct)
    {
        var items = await _uow.Especialidades.ObtenerActivasAsync(ct);
        return Ok(items.Select(e => new EspecialidadDto(e.Id, e.Nombre, e.Descripcion)));
    }

    [HttpGet("tipos-cita")]
    [ProducesResponseType(typeof(List<TipoCitaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TiposCita(
        [FromQuery] string? categoria = null, CancellationToken ct = default)
    {
        var items = await _uow.TiposCita.ObtenerActivasPorCategoriaAsync(categoria, ct);
        return Ok(items.Select(t => t.ToDto()));
    }

    [HttpGet("aseguradoras")]
    [ProducesResponseType(typeof(List<AseguradoraDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Aseguradoras(
        [FromQuery] string? nombre = null,
        [FromQuery] byte? tipoEntidadId = null,
        CancellationToken ct = default)
    {
        ValidarMinimoBusqueda(nombre, ConfiguracionBusqueda.ASEGURADORA);
        var items = await _uow.Aseguradoras.BuscarAsync(nombre, tipoEntidadId, ct);
        return Ok(items.Select(a => a.ToDto()));
    }

    [HttpGet("sedes")]
    [ProducesResponseType(typeof(List<SedeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Sedes(CancellationToken ct)
    {
        var items = await _uow.Sedes.ObtenerActivasAsync(ct);
        return Ok(items.Select(s => new SedeDto(s.Id, s.Nombre, s.Direccion, s.Ciudad)));
    }

    [HttpGet("tipos-identificacion")]
    [ProducesResponseType(typeof(List<TipoIdentificacionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TiposIdentificacion(CancellationToken ct)
    {
        var items = await _uow.TiposIdentificacion.ObtenerTodosAsync(ct);
        return Ok(items.Select(t => new TipoIdentificacionDto(t.Id, t.Codigo, t.Nombre)));
    }

    [HttpGet("tipos-entidad")]
    [ProducesResponseType(typeof(List<TipoEntidadDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TiposEntidad(CancellationToken ct)
    {
        var items = await _uow.TiposEntidad.ObtenerTodosAsync(ct);
        return Ok(items.Select(t => t.ToDto()));
    }

    [HttpGet("tipos-usuario")]
    [ProducesResponseType(typeof(List<TipoUsuarioDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> TiposUsuario(CancellationToken ct)
    {
        var items = await _uow.TiposUsuario.ObtenerTodosAsync(ct);
        return Ok(items.Select(t => t.ToDto()));
    }

    [HttpGet("motivos-cancelacion")]
    [ProducesResponseType(typeof(List<MotivoCancelacionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MotivosCancelacion(CancellationToken ct)
    {
        var items = await _uow.MotivosCancelacion.ObtenerActivosAsync(ct);
        return Ok(items.Select(m => new MotivoCancelacionDto(m.Id, m.Nombre, m.Descripcion, m.Orden)));
    }

    [HttpGet("departamentos")]
    [ProducesResponseType(typeof(List<DepartamentoDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Departamentos(CancellationToken ct)
    {
        var items = await _uow.Departamentos.ObtenerTodosAsync(ct);
        return Ok(items.Select(d => d.ToDto()));
    }

    [HttpGet("municipios")]
    [ProducesResponseType(typeof(List<MunicipioDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Municipios(
        [FromQuery] string? codigoDepartamento = null,
        [FromQuery] string? nombre = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(codigoDepartamento) &&
            string.IsNullOrWhiteSpace(nombre))
            return BadRequest(new
            {
                codigo = "PARAMETRO_REQUERIDO",
                mensaje = "Debe indicar codigoDepartamento o un nombre para buscar."
            });

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            ValidarMinimoBusqueda(nombre, ConfiguracionBusqueda.MUNICIPIO);
            var resultados = await _uow.Municipios.BuscarAsync(nombre, ct);
            return Ok(resultados.Select(m => m.ToDto()));
        }

        var items = await _uow.Municipios.ObtenerPorDepartamentoAsync(codigoDepartamento!, ct);
        return Ok(items.Select(m => m.ToDto()));
    }

    /// <summary>
    /// Exige el mínimo de caracteres definido en ConfiguracionBusqueda
    /// antes de ejecutar la búsqueda en la base de datos.
    /// </summary>
    internal static void ValidarMinimoBusqueda(string? termino, string campo)
    {
        if (string.IsNullOrWhiteSpace(termino))
            return;

        var regla = ConfiguracionBusqueda.PorCampo(campo);
        if (termino.Trim().Length < regla.MinimoCaracteres)
        {
            var mensaje = regla.MinimoCaracteres == 0
                ? $"La búsqueda por {regla.Etiqueta} no es válida."
                : $"La búsqueda por {regla.Etiqueta} requiere al menos {regla.MinimoCaracteres} caracteres.";
            throw new DomainException(mensaje);
        }
    }
}