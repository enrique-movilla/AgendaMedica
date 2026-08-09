// ============================================================
//  AGENDA MÉDICA — CONSULTAS (QUERIES) CQRS
//  Proyecto : AgendaMedica.Application / Queries
//  Archivo  : Queries.cs
// ============================================================

using AgendaMedica.Application.DTOs;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Domain.Interfaces;
using MediatR;

namespace AgendaMedica.Application.Queries;

// ══════════════════════════════════════════════════════════════
//  AGENDA DEL DÍA
// ══════════════════════════════════════════════════════════════
public record ObtenerAgendaDiaQuery(
    int ProfesionalId,
    DateOnly Fecha
) : IRequest<List<AgendaDiaItemDto>>;

public class ObtenerAgendaDiaHandler
    : IRequestHandler<ObtenerAgendaDiaQuery, List<AgendaDiaItemDto>>
{
    private readonly IUnitOfWork _uow;
    public ObtenerAgendaDiaHandler(IUnitOfWork uow) => _uow = uow;

    // ============================================================
    //  CORRECCIÓN: ObtenerAgendaDiaHandler en Queries.cs
    //  Reemplace SOLO el método Handle de esta clase.
    //  El cambio es agregar el campo Regimen al AgendaDiaItemDto.
    // ============================================================

    public async Task<List<AgendaDiaItemDto>> Handle(
        ObtenerAgendaDiaQuery request, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var citas = await _uow.Citas.ObtenerAgendaDiaAsync(
            request.ProfesionalId, request.Fecha, ct);

        return citas.Select(c => new AgendaDiaItemDto(
            CitaId: c.Id,
            HoraInicio: c.FechaHora.ToString("HH:mm"),
            HoraFin: c.FechaHoraFin.ToString("HH:mm"),
            Paciente: c.Paciente!.NombresCompletos,
            Identificacion: $"{c.Paciente.TipoIdentificacion!.Codigo} {c.Paciente.NumeroIdentificacion}",
            EdadPaciente: c.Paciente.EdadAnios,
            Sexo: c.Paciente.Sexo,
            TipoCita: c.TipoCita!.Nombre,
            Estado: c.Estado.ToString(),
            EstadoId: c.EstadoCitaId,
            Aseguradora: c.Paciente.Aseguradora is not null
                                ? $"{c.Paciente.Aseguradora.Nombre} — {c.Paciente.Aseguradora.Sigla}"
                                : null,
            Regimen: c.TipoUsuario?.Nombre          // ← campo nuevo v1.1
                            ?? c.Paciente.TipoUsuario?.Nombre,
            MotivoConsulta: c.MotivoConsulta,
            TeamsJoinUrl: c.TeamsJoinUrl
        )).ToList();
    }
}

// ══════════════════════════════════════════════════════════════
//  DISPONIBILIDAD DE UN PROFESIONAL
// ══════════════════════════════════════════════════════════════
public record ObtenerDisponibilidadQuery(
    int ProfesionalId,
    DateOnly Fecha,
    int TipoCitaId
) : IRequest<DisponibilidadDto>;

public class ObtenerDisponibilidadHandler
    : IRequestHandler<ObtenerDisponibilidadQuery, DisponibilidadDto>
{
    private readonly IUnitOfWork _uow;
    public ObtenerDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<DisponibilidadDto> Handle(
        ObtenerDisponibilidadQuery request, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var tipoCita = await _uow.TiposCita.ObtenerPorIdAsync(request.TipoCitaId, ct)
            ?? throw new EntidadNoEncontradaException("TipoCita", request.TipoCitaId);

        var citasDelDia = await _uow.Citas.ObtenerAgendaDiaAsync(
            request.ProfesionalId, request.Fecha, ct);

        var slotsOcupados = citasDelDia.Select(c => new SlotOcupadoDto(
            HoraInicio: c.FechaHora.ToString("HH:mm"),
            HoraFin: c.FechaHoraFin.ToString("HH:mm"),
            Estado: c.Estado.ToString()
        )).ToList();

        // ── Plantillas horarias del profesional para ese día ──
        var diaSemana = (byte)request.Fecha.DayOfWeek == 0
            ? (byte)7
            : (byte)request.Fecha.DayOfWeek; // Lunes=1..Domingo=7

        var plantillas = await _uow.Disponibilidades.ObtenerPorDiaAsync(
            request.ProfesionalId, diaSemana, ct);

        // ── Genera slots libres desde la plantilla ─────────────
        var slotsLibres = GenerarSlotsLibres(
            plantillas, citasDelDia, tipoCita.DuracionMinutos, request.Fecha);

        return new DisponibilidadDto(
            ProfesionalId: profesional.Id,
            NombreProfesional: profesional.NombresCompletos,
            Fecha: request.Fecha,
            DuracionSlotMinutos: tipoCita.DuracionMinutos,
            SlotsOcupados: slotsOcupados,
            SlotsLibres: slotsLibres
        );
    }

    private static List<SlotLibreDto> GenerarSlotsLibres(
        IList<Domain.Entities.DisponibilidadProfesional> plantillas,
        IList<Domain.Entities.Cita> citas,
        int duracionMinutos,
        DateOnly fecha)
    {
        if (plantillas.Count == 0) return new();

        // Convertir citas del día a rangos para el cruce
        var ocupados = citas
            .Select(c => (Inicio: c.FechaHora.TimeOfDay, Fin: c.FechaHoraFin.TimeOfDay))
            .ToList();

        var libres = new List<SlotLibreDto>();
        foreach (var p in plantillas.OrderBy(p => p.HoraInicio))
        {
            var inicio = p.HoraInicio;
            var fin    = p.HoraFin;

            while (inicio + TimeSpan.FromMinutes(duracionMinutos) <= fin)
            {
                var finSlot = inicio + TimeSpan.FromMinutes(duracionMinutos);
                var choca = ocupados.Any(o =>
                    inicio < o.Fin && finSlot > o.Inicio);
                if (!choca)
                {
                    libres.Add(new SlotLibreDto(
                        HoraInicio: new DateTime(fecha.Year, fecha.Month, fecha.Day, inicio.Hours, inicio.Minutes, 0).ToString("HH:mm"),
                        HoraFin: new DateTime(fecha.Year, fecha.Month, fecha.Day, finSlot.Hours, finSlot.Minutes, 0).ToString("HH:mm"),
                        Disponible: true,
                        ConsultorioSala: p.ConsultorioSala));
                }
                inicio = finSlot;
            }
        }
        return libres;
    }
}

// ══════════════════════════════════════════════════════════════
//  PLANTILLAS DE DISPONIBILIDAD DE UN PROFESIONAL (Fase 1)
// ══════════════════════════════════════════════════════════════
public record ObtenerPlantillasDisponibilidadQuery(int ProfesionalId)
    : IRequest<List<DisponibilidadProfesionalDto>>;

public class ObtenerPlantillasDisponibilidadHandler
    : IRequestHandler<ObtenerPlantillasDisponibilidadQuery, List<DisponibilidadProfesionalDto>>
{
    private readonly IUnitOfWork _uow;
    public ObtenerPlantillasDisponibilidadHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<List<DisponibilidadProfesionalDto>> Handle(
        ObtenerPlantillasDisponibilidadQuery request, CancellationToken ct)
    {
        var plantillas = await _uow.Disponibilidades.ObtenerTodasDelProfesionalAsync(
            request.ProfesionalId, ct);

        return plantillas.Select(p => p.ToDisponibilidadDto()).ToList();
    }
}

// ══════════════════════════════════════════════════════════════
//  DETALLE DE UNA CITA
// ══════════════════════════════════════════════════════════════
public record ObtenerCitaQuery(int CitaId) : IRequest<CitaDto>;

public class ObtenerCitaHandler : IRequestHandler<ObtenerCitaQuery, CitaDto>
{
    private readonly IUnitOfWork _uow;
    public ObtenerCitaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<CitaDto> Handle(
        ObtenerCitaQuery request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        return cita.ToDto();
    }
}

// ── Historial de estados de una cita ─────────────────────────
public record ObtenerHistorialCitaQuery(int CitaId)
    : IRequest<List<HistorialEstadoDto>>;

public class ObtenerHistorialCitaHandler
    : IRequestHandler<ObtenerHistorialCitaQuery, List<HistorialEstadoDto>>
{
    private readonly IUnitOfWork _uow;
    public ObtenerHistorialCitaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<List<HistorialEstadoDto>> Handle(
        ObtenerHistorialCitaQuery request, CancellationToken ct)
    {
        var cita = await _uow.Citas.ObtenerPorIdAsync(request.CitaId, ct)
            ?? throw new EntidadNoEncontradaException("Cita", request.CitaId);

        return cita.Historial.Select(h => new HistorialEstadoDto(
            Id: h.Id,
            EstadoAnterior: h.EstadoAnteriorId.HasValue
                                ? ((Domain.Enums.EstadoCita)h.EstadoAnteriorId.Value).ToString()
                                : null,
            EstadoNuevo: ((Domain.Enums.EstadoCita)h.EstadoNuevoId).ToString(),
            Motivo: h.Motivo,
            CambiadoPor: h.CambiadoPor,
            FechaCambio: h.FechaCambio,
            Origen: h.Origen
        )).ToList();
    }
}

// ══════════════════════════════════════════════════════════════
//  BÚSQUEDA DE PACIENTES
// ══════════════════════════════════════════════════════════════

// ── Búsqueda rápida por documento ────────────────────────────
public record BuscarPacientePorDocumentoQuery(
    byte TipoIdentificacionId,
    string NumeroIdentificacion
) : IRequest<PacienteDto?>;

public class BuscarPacientePorDocumentoHandler
    : IRequestHandler<BuscarPacientePorDocumentoQuery, PacienteDto?>
{
    private readonly IUnitOfWork _uow;
    public BuscarPacientePorDocumentoHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<PacienteDto?> Handle(
        BuscarPacientePorDocumentoQuery request, CancellationToken ct)
    {
        var paciente = await _uow.Pacientes.ObtenerPorIdentificacionAsync(
            request.TipoIdentificacionId, request.NumeroIdentificacion, ct);

        return paciente?.ToPacienteDto();
    }
}

// ── Búsqueda paginada de pacientes ────────────────────────────
public record BuscarPacientesQuery(
    string? Nombre = null,
    byte? TipoIdentificacionId = null,
    string? NumeroIdentificacion = null,
    int? AseguradoraId = null,
    int Pagina = 1,
    int TamPagina = 20
) : IRequest<PacienteListaDto>;

public class BuscarPacientesHandler
    : IRequestHandler<BuscarPacientesQuery, PacienteListaDto>
{
    private readonly IUnitOfWork _uow;
    public BuscarPacientesHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<PacienteListaDto> Handle(
        BuscarPacientesQuery request, CancellationToken ct)
    {
        var (items, total) = await _uow.Pacientes.BuscarAsync(
            nombre: request.Nombre,
            tipoIdentificacionId: request.TipoIdentificacionId,
            numeroIdentificacion: request.NumeroIdentificacion,
            aseguradoraId: request.AseguradoraId,
            pagina: request.Pagina,
            tamPagina: request.TamPagina,
            ct: ct);

        var totalPaginas = (int)Math.Ceiling((double)total / request.TamPagina);

        return new PacienteListaDto(
            Items: items.Select(p => p.ToPacienteDto()).ToList(),
            Total: total,
            Pagina: request.Pagina,
            TamPagina: request.TamPagina,
            TotalPaginas: totalPaginas
        );
    }
}