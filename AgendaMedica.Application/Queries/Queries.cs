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

    public async Task<List<AgendaDiaItemDto>> Handle(
        ObtenerAgendaDiaQuery request, CancellationToken ct)
    {
        var profesional = await _uow.Profesionales.ObtenerPorIdAsync(request.ProfesionalId, ct)
            ?? throw new EntidadNoEncontradaException("Profesional", request.ProfesionalId);

        var citas = await _uow.Citas.ObtenerAgendaDiaAsync(
            request.ProfesionalId, request.Fecha, ct);

        var nombre = profesional.NombresCompletos;
        var especialidad = profesional.Especialidad?.Nombre;

        return citas.Select(c => Mapear(c, request.Fecha, nombre, especialidad)).ToList();
    }

    internal static AgendaDiaItemDto Mapear(
        Domain.Entities.Cita c, DateOnly fecha, string nombreProfesional, string? especialidad)
        => new(
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
            Regimen: c.TipoUsuario?.Nombre
                            ?? c.Paciente.TipoUsuario?.Nombre,
            MotivoConsulta: c.MotivoConsulta,
            TeamsJoinUrl: c.TeamsJoinUrl,
            Fecha: fecha,
            ProfesionalId: c.ProfesionalId,
            ProfesionalNombre: nombreProfesional,
            Especialidad: especialidad,
            DuracionMinutos: (int)(c.FechaHoraFin - c.FechaHora).TotalMinutes
        );
}

// ══════════════════════════════════════════════════════════════
//  AGENDA POR RANGO (semanal/mensual/lista — Fase 2)
// ══════════════════════════════════════════════════════════════
public record ObtenerAgendaRangoQuery(
    IReadOnlyCollection<int> ProfesionalesIds,
    DateOnly FechaDesde,
    DateOnly FechaHasta
) : IRequest<List<AgendaDiaItemDto>>;

public class ObtenerAgendaRangoHandler
    : IRequestHandler<ObtenerAgendaRangoQuery, List<AgendaDiaItemDto>>
{
    private readonly IUnitOfWork _uow;
    public ObtenerAgendaRangoHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<List<AgendaDiaItemDto>> Handle(
        ObtenerAgendaRangoQuery request, CancellationToken ct)
    {
        if (request.ProfesionalesIds.Count == 0)
            return new();

        var profesionales = await _uow.Profesionales.ObtenerPorIdsAsync(
            request.ProfesionalesIds, ct);

        var citas = await _uow.Citas.ObtenerAgendaRangoAsync(
            request.ProfesionalesIds, request.FechaDesde, request.FechaHasta, ct);

        return citas.Select(c =>
        {
            var p = profesionales.FirstOrDefault(x => x.Id == c.ProfesionalId);
            return ObtenerAgendaDiaHandler.Mapear(
                c, DateOnly.FromDateTime(c.FechaHora),
                p?.NombresCompletos ?? "—", p?.Especialidad?.Nombre);
        }).ToList();
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

        // ── Bloqueos de agenda y excepciones horarias (Fase 3) ─
        var bloqueos = await _uow.BloqueosAgenda.ObtenerPorFechaAsync(
            request.ProfesionalId, request.Fecha, ct);

        var excepciones = await _uow.ExcepcionesHorarias.ObtenerPorFechaAsync(
            request.ProfesionalId, request.Fecha, ct);

        // ── Genera slots libres desde la plantilla ─────────────
        var slotsLibres = GenerarSlotsLibres(
            plantillas, excepciones, bloqueos, citasDelDia,
            tipoCita.DuracionMinutos, request.Fecha);

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
        IList<Domain.Entities.ExcepcionHoraria> excepciones,
        IList<Domain.Entities.BloqueoAgenda> bloqueos,
        IList<Domain.Entities.Cita> citas,
        int duracionMinutos,
        DateOnly fecha)
    {
        // Si hay excepciones para el día, reemplazan la plantilla semanal.
        var rangos = excepciones.Count > 0
            ? excepciones
                .Select(e => (Inicio: e.HoraInicio,
                              Fin: e.HoraFin,
                              Consultorio: (string?)null))
                .ToList()
            : plantillas
                .Select(p => (Inicio: p.HoraInicio,
                              Fin: p.HoraFin,
                              Consultorio: p.ConsultorioSala))
                .OrderBy(r => r.Inicio)
                .ToList();

        if (rangos.Count == 0) return new();

        // Convertir citas del día a rangos para el cruce
        var ocupados = citas
            .Select(c => (Inicio: c.FechaHora.TimeOfDay, Fin: c.FechaHoraFin.TimeOfDay))
            .ToList();

        // Franjas bloqueadas (día completo o rango horario)
        var bloqueados = bloqueos
            .Select(b => (Inicio: b.HoraInicio, Fin: b.HoraFin))
            .ToList();

        var libres = new List<SlotLibreDto>();
        foreach (var baseRango in rangos)
        {
            var trozos = RestarBloqueos(
                (baseRango.Inicio, baseRango.Fin), bloqueados);
            foreach (var (inicio, fin) in trozos)
            {
                var cursor = inicio;
                while (cursor + TimeSpan.FromMinutes(duracionMinutos) <= fin)
                {
                    var finSlot = cursor + TimeSpan.FromMinutes(duracionMinutos);
                    var choca = ocupados.Any(o =>
                        cursor < o.Fin && finSlot > o.Inicio);
                    if (!choca)
                    {
                        libres.Add(new SlotLibreDto(
                            HoraInicio: new DateTime(fecha.Year, fecha.Month, fecha.Day, cursor.Hours, cursor.Minutes, 0).ToString("HH:mm"),
                            HoraFin: new DateTime(fecha.Year, fecha.Month, fecha.Day, finSlot.Hours, finSlot.Minutes, 0).ToString("HH:mm"),
                            Disponible: true,
                            ConsultorioSala: baseRango.Consultorio));
                    }
                    cursor = finSlot;
                }
            }
        }
        return libres;
    }

    /// <summary>
    /// Divide un rango base restando las franjas bloqueadas.
    /// Un bloqueo sin horas elimina el rango completo (día bloqueado).
    /// </summary>
    private static List<(TimeSpan Inicio, TimeSpan Fin)> RestarBloqueos(
        (TimeSpan Inicio, TimeSpan Fin) rango,
        List<(TimeSpan? Inicio, TimeSpan? Fin)> bloqueados)
    {
        var trozos = new List<(TimeSpan Inicio, TimeSpan Fin)> { rango };

        foreach (var b in bloqueados)
        {
            // Bloqueo de día completo: elimina todos los trozos.
            if (b.Inicio is null || b.Fin is null)
            {
                trozos = new();
                break;
            }

            var bi = b.Inicio.Value;
            var bf = b.Fin.Value;
            if (bf <= rango.Inicio || bi >= rango.Fin) continue;

            var nuevos = new List<(TimeSpan Inicio, TimeSpan Fin)>();
            foreach (var t in trozos)
            {
                // Sin solape o bordes con el trozo.
                if (bf <= t.Inicio || bi >= t.Fin)
                {
                    nuevos.Add(t);
                }
                else if (bi <= t.Inicio && bf >= t.Fin)
                {
                    // Bloqueo cubre el trozo completo: se descarta.
                }
                else if (bi <= t.Inicio)
                {
                    nuevos.Add((bf, t.Fin));
                }
                else if (bf >= t.Fin)
                {
                    nuevos.Add((t.Inicio, bi));
                }
                else
                {
                    nuevos.Add((t.Inicio, bi));
                    nuevos.Add((bf, t.Fin));
                }
            }
            trozos = nuevos;
            if (trozos.Count == 0) break;
        }

        return trozos;
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
//  BLOQUEOS DE AGENDA DE UN PROFESIONAL (Fase 3)
// ══════════════════════════════════════════════════════════════
public record ObtenerBloqueosAgendaQuery(int ProfesionalId)
    : IRequest<List<BloqueoAgendaDto>>;

public class ObtenerBloqueosAgendaHandler
    : IRequestHandler<ObtenerBloqueosAgendaQuery, List<BloqueoAgendaDto>>
{
    private readonly IUnitOfWork _uow;
    public ObtenerBloqueosAgendaHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<List<BloqueoAgendaDto>> Handle(
        ObtenerBloqueosAgendaQuery request, CancellationToken ct)
    {
        var bloqueos = await _uow.BloqueosAgenda.ObtenerTodasDelProfesionalAsync(
            request.ProfesionalId, ct);

        return bloqueos.Select(b => b.ToBloqueoAgendaDto()).ToList();
    }
}

// ══════════════════════════════════════════════════════════════
//  EXCEPCIONES HORARIAS DE UN PROFESIONAL (Fase 3)
// ══════════════════════════════════════════════════════════════
public record ObtenerExcepcionesHorariasQuery(int ProfesionalId)
    : IRequest<List<ExcepcionHorariaDto>>;

public class ObtenerExcepcionesHorariasHandler
    : IRequestHandler<ObtenerExcepcionesHorariasQuery, List<ExcepcionHorariaDto>>
{
    private readonly IUnitOfWork _uow;
    public ObtenerExcepcionesHorariasHandler(IUnitOfWork uow) => _uow = uow;

    public async Task<List<ExcepcionHorariaDto>> Handle(
        ObtenerExcepcionesHorariasQuery request, CancellationToken ct)
    {
        var excepciones = await _uow.ExcepcionesHorarias.ObtenerTodasDelProfesionalAsync(
            request.ProfesionalId, ct);

        return excepciones.Select(e => e.ToExcepcionHorariaDto()).ToList();
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