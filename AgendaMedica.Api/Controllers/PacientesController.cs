// ============================================================
//  AGENDA MÉDICA — PACIENTES CONTROLLER (v1.1)
//  Proyecto : AgendaMedica.Api / Controllers
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Application.Queries;
using AgendaMedica.Domain;
using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Domain.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/[controller]")]
[Produces("application/json")]
public class PacientesController : ControllerBase
{
    private readonly IMediator   _mediator;
    private readonly IUnitOfWork _uow;

    public PacientesController(IMediator mediator, IUnitOfWork uow)
    {
        _mediator = mediator;
        _uow      = uow;
    }

    // ── GET v1/pacientes/buscar-por-documento ─────────────────
    [HttpGet("buscar-por-documento")]
    [ProducesResponseType(typeof(PacienteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> BuscarPorDocumento(
        [FromQuery] byte   tipoIdentificacionId,
        [FromQuery] string numeroIdentificacion,
        CancellationToken  ct)
    {
        var resultado = await _mediator.Send(
            new BuscarPacientePorDocumentoQuery(tipoIdentificacionId, numeroIdentificacion), ct);

        if (resultado is null)
            return NotFound(new
            {
                codigo  = "NO_ENCONTRADO",
                mensaje = "No existe paciente con ese documento. Puede registrarlo como nuevo."
            });

        return Ok(resultado);
    }

    // ── GET v1/pacientes ──────────────────────────────────────
    [HttpGet]
    [ProducesResponseType(typeof(PacienteListaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Buscar(
        [FromQuery] string? nombre               = null,
        [FromQuery] byte?   tipoIdentificacionId = null,
        [FromQuery] string? numeroIdentificacion = null,
        [FromQuery] int?    aseguradoraId        = null,
        [FromQuery] int     pagina               = 1,
        [FromQuery] int     tamPagina            = 20,
        CancellationToken   ct                   = default)
    {
        ValidarMinimoBusqueda(nombre, ConfiguracionBusqueda.NOMBRE);
        ValidarMinimoBusqueda(numeroIdentificacion, ConfiguracionBusqueda.DOCUMENTO);
        var resultado = await _mediator.Send(new BuscarPacientesQuery(
            Nombre:               nombre,
            TipoIdentificacionId: tipoIdentificacionId,
            NumeroIdentificacion: numeroIdentificacion,
            AseguradoraId:        aseguradoraId,
            Pagina:               pagina,
            TamPagina:            tamPagina), ct);

        return Ok(resultado);
    }

    // ── GET v1/pacientes/{id} ─────────────────────────────────
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PacienteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObtenerPorId(int id, CancellationToken ct)
    {
        var paciente = await _uow.Pacientes.ObtenerPorIdAsync(id, ct);
        if (paciente is null)
            return NotFound(new { codigo = "NO_ENCONTRADO",
                                  mensaje = $"Paciente con Id {id} no encontrado." });

        return Ok(paciente.ToPacienteDto());
    }

    // ── POST v1/pacientes ─────────────────────────────────────
    [HttpPost]
    [ProducesResponseType(typeof(PacienteDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Crear(
        [FromBody] CrearPacienteRequest request, CancellationToken ct)
    {
        var existe = await _uow.Pacientes.ExisteIdentificacionAsync(
            request.TipoIdentificacionId, request.NumeroIdentificacion, ct: ct);

        if (existe)
            throw new EntidadDuplicadaException("paciente",
                $"{request.TipoIdentificacionId} {request.NumeroIdentificacion}");

        var paciente = new Paciente(
            tipoIdentificacionId: request.TipoIdentificacionId,
            numeroIdentificacion: request.NumeroIdentificacion,
            nombresCompletos:     request.NombresCompletos,
            fechaNacimiento:      request.FechaNacimiento,
            sexo:                 request.Sexo,
            celular:              request.Celular,
            email:                request.Email,
            whatsapp:             request.Whatsapp,
            aseguradoraId:        request.AseguradoraId,
            tipoUsuarioId:        request.TipoUsuarioId,   // ← v1.1
            empresa:              request.Empresa
        );

        await _uow.Pacientes.AgregarAsync(paciente, ct);
        await _uow.GuardarAsync(ct);

        return CreatedAtAction(
            nameof(ObtenerPorId),
            new { id = paciente.Id },
            paciente.ToPacienteDto());
    }

    // ── PUT v1/pacientes/{id} ─────────────────────────────────
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(PacienteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Actualizar(
        int id, [FromBody] ActualizarPacienteRequest request, CancellationToken ct)
    {
        var paciente = await _uow.Pacientes.ObtenerPorIdAsync(id, ct)
            ?? throw new EntidadNoEncontradaException("Paciente", id);

        paciente.ActualizarContacto(request.Celular, request.Email, request.Whatsapp);

        // ← v1.1: ActualizarCobertura ahora recibe también TipoUsuarioId y Empresa
        paciente.ActualizarCobertura(request.AseguradoraId, request.TipoUsuarioId, request.Empresa);

        if (!string.IsNullOrWhiteSpace(request.NombresCompletos))
            paciente.ActualizarNombre(request.NombresCompletos);

        _uow.Pacientes.Actualizar(paciente);
        await _uow.GuardarAsync(ct);

        return Ok(paciente.ToPacienteDto());
    }

    // ── DELETE v1/pacientes/{id} ──────────────────────────────
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Inactivar(int id, CancellationToken ct)
    {
        var paciente = await _uow.Pacientes.ObtenerPorIdAsync(id, ct)
            ?? throw new EntidadNoEncontradaException("Paciente", id);

        paciente.Inactivar();
        _uow.Pacientes.Actualizar(paciente);
        await _uow.GuardarAsync(ct);

        return NoContent();
    }

    // ── GET v1/pacientes/{id}/citas ───────────────────────────
    [HttpGet("{id:int}/citas")]
    [ProducesResponseType(typeof(List<CitaDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ObtenerCitas(
        int id,
        [FromQuery] int pagina    = 1,
        [FromQuery] int tamPagina = 10,
        CancellationToken ct      = default)
    {
        var paciente = await _uow.Pacientes.ObtenerPorIdAsync(id, ct)
            ?? throw new EntidadNoEncontradaException("Paciente", id);

        var citas = await _uow.Citas.ObtenerPorPacienteAsync(id, pagina, tamPagina, ct);
        return Ok(citas.Select(c => c.ToDto()).ToList());
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
        if (regla.MinimoCaracteres > 0 && termino.Trim().Length < regla.MinimoCaracteres)
        {
            var mensaje = $"La búsqueda por {regla.Etiqueta} requiere al menos {regla.MinimoCaracteres} caracteres.";
            throw new DomainException(mensaje);
        }
    }
}

// ── Request models ────────────────────────────────────────────
public record CrearPacienteRequest(
    byte     TipoIdentificacionId,
    string   NumeroIdentificacion,
    string   NombresCompletos,
    DateOnly FechaNacimiento,
    char     Sexo,
    string?  Celular,
    string?  Email,
    string?  Whatsapp,
    int?     AseguradoraId,
    byte?    TipoUsuarioId,    // ← v1.1: régimen del paciente
    string?  Empresa
);

public record ActualizarPacienteRequest(
    string?  NombresCompletos,
    string?  Celular,
    string?  Email,
    string?  Whatsapp,
    int?     AseguradoraId,
    byte?    TipoUsuarioId,    // ← v1.1: régimen del paciente
    string?  Empresa
);
