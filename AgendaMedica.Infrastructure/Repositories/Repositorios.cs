// ============================================================
//  AGENDA MÉDICA — REPOSITORIOS CONCRETOS (v1.2)
//  Proyecto : AgendaMedica.Infrastructure / Repositories
//  Archivo  : Repositorios.cs
// ============================================================
//  Corrección v1.2: en todas las consultas que cargan Paciente
//  con su Aseguradora, se quitó el ThenInclude de Municipio
//  y Departamento para evitar el error 'DepartamentoCodigoDane'.
//  EF Core genera ese nombre por convención cuando la FK/PK
//  es de tipo string y no está configurada explícitamente
//  en el grafo de carga transitivo.
// ============================================================

using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Enums;
using AgendaMedica.Domain.Interfaces;
using AgendaMedica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AgendaMedica.Infrastructure.Repositories;

// ══════════════════════════════════════════════════════════════
//  CITA REPOSITORIO
// ══════════════════════════════════════════════════════════════
public class CitaRepositorio : RepositorioBase<Cita>, ICitaRepositorio
{
    public CitaRepositorio(AgendaDbContext db) : base(db) { }

    // Override del base (RepositorioBase usa FindAsync, que no carga
    // navegaciones y rompe el ToDto de detalle de cita).
    public override async Task<Cita?> ObtenerPorIdAsync(
        int id, CancellationToken ct = default)
        => await _db.Citas
            .Include(c => c.TipoCita)
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.TipoIdentificacion)
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.Aseguradora)
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.TipoUsuario)
            .Include(c => c.Profesional)
                .ThenInclude(p => p!.Especialidad)
            .Include(c => c.Profesional)
                .ThenInclude(p => p!.Sede)
            .Include(c => c.Aseguradora)
            .Include(c => c.TipoUsuario)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IList<Cita>> ObtenerPorProfesionalYFechaAsync(
        int profesionalId, DateOnly fechaDesde, DateOnly fechaHasta,
        CancellationToken ct = default)
    {
        var desde = fechaDesde.ToDateTime(TimeOnly.MinValue);
        var hasta = fechaHasta.ToDateTime(TimeOnly.MaxValue);

        return await _db.Citas
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.TipoIdentificacion)
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.Aseguradora)
                    // ← sin ThenInclude Municipio/Departamento
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.TipoUsuario)
            .Include(c => c.TipoCita)
            .Include(c => c.Aseguradora)   // aseguradora de la cita
            .Include(c => c.TipoUsuario)   // régimen de la cita
            .Where(c => c.ProfesionalId == profesionalId
                     && c.FechaHora    >= desde
                     && c.FechaHora    <= hasta)
            .OrderBy(c => c.FechaHora)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<IList<Cita>> ObtenerPorPacienteAsync(
        int pacienteId, int pagina = 1, int tamPagina = 10,
        CancellationToken ct = default)
    {
        return await _db.Citas
            .Include(c => c.Profesional)
                .ThenInclude(p => p!.Especialidad)
            .Include(c => c.TipoCita)
            .Include(c => c.Aseguradora)
            .Include(c => c.TipoUsuario)
            .Where(c => c.PacienteId == pacienteId)
            .OrderByDescending(c => c.FechaHora)
            .Skip((pagina - 1) * tamPagina)
            .Take(tamPagina)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<Cita?> ObtenerPorTeamsEventIdAsync(
        string teamsEventId, CancellationToken ct = default)
        => await _db.Citas
            .FirstOrDefaultAsync(c => c.TeamsEventId == teamsEventId, ct);

    public async Task<bool> ExisteTraslapeAsync(
        int profesionalId, DateTime inicio, DateTime fin,
        int? citaIdExcluir = null, CancellationToken ct = default)
    {
        var query = _db.Citas.Where(c =>
            c.ProfesionalId == profesionalId &&
            c.EstadoCitaId  != 5 &&
            c.EstadoCitaId  != 6 &&
            c.FechaHora      < fin &&
            c.FechaHoraFin   > inicio);

        if (citaIdExcluir.HasValue)
            query = query.Where(c => c.Id != citaIdExcluir.Value);

        return await query.AnyAsync(ct);
    }

    public async Task<IList<Cita>> ObtenerAgendaDiaAsync(
        int profesionalId, DateOnly fecha, CancellationToken ct = default)
    {
        var inicio = fecha.ToDateTime(TimeOnly.MinValue);
        var fin    = fecha.ToDateTime(TimeOnly.MaxValue);

        return await _db.Citas
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.TipoIdentificacion)
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.Aseguradora)
                    // ← sin ThenInclude Municipio/Departamento
            .Include(c => c.Paciente)
                .ThenInclude(p => p!.TipoUsuario)
            .Include(c => c.TipoCita)
            .Include(c => c.TipoUsuario)   // régimen de la cita
            .Where(c => c.ProfesionalId == profesionalId
                     && c.FechaHora    >= inicio
                     && c.FechaHora    <= fin
                     && c.EstadoCitaId != 5
                     && c.EstadoCitaId != 6)
            .OrderBy(c => c.FechaHora)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<IList<OutboxMensaje>> ObtenerOutboxPendientesAsync(
        int cantidad = 10, CancellationToken ct = default)
    {
        return await _db.OutboxMensajes
            .Include(o => o.Cita)
                .ThenInclude(c => c!.Paciente)
            .Include(o => o.Cita)
                .ThenInclude(c => c!.Profesional)
            .Include(o => o.Cita)
                .ThenInclude(c => c!.TipoCita)
            .Where(o => !o.Procesado && o.Intentos < 5)
            .OrderBy(o => o.FechaCreacion)
            .Take(cantidad)
            .ToListAsync(ct);
    }
}

// ══════════════════════════════════════════════════════════════
//  PACIENTE REPOSITORIO
// ══════════════════════════════════════════════════════════════
public class PacienteRepositorio : RepositorioBase<Paciente>, IPacienteRepositorio
{
    public PacienteRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<Paciente?> ObtenerPorIdentificacionAsync(
        byte tipoIdentificacionId, string numeroIdentificacion,
        CancellationToken ct = default)
    {
        return await _db.Pacientes
            .Include(p => p.TipoIdentificacion)
            .Include(p => p.Aseguradora)   // ← sin ThenInclude Municipio
            .Include(p => p.TipoUsuario)
            .AsNoTracking()
            .FirstOrDefaultAsync(p =>
                p.TipoIdentificacionId == tipoIdentificacionId &&
                p.NumeroIdentificacion == numeroIdentificacion &&
                p.Activo, ct);
    }

    public async Task<(IList<Paciente> Items, int Total)> BuscarAsync(
        string? nombre               = null,
        byte?   tipoIdentificacionId = null,
        string? numeroIdentificacion = null,
        int?    aseguradoraId        = null,
        int     pagina               = 1,
        int     tamPagina            = 20,
        CancellationToken ct         = default)
    {
        var query = _db.Pacientes
            .Include(p => p.TipoIdentificacion)
            .Include(p => p.Aseguradora)   // ← sin ThenInclude Municipio
            .Include(p => p.TipoUsuario)
            .Where(p => p.Activo)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(nombre))
            query = query.Where(p => EF.Functions.ILike(
                EF.Functions.Unaccent(p.NombresCompletos),
                $"%{NormalizacionTexto.Normalizar(nombre)}%"));

        if (tipoIdentificacionId.HasValue)
            query = query.Where(p => p.TipoIdentificacionId == tipoIdentificacionId.Value);

        if (!string.IsNullOrWhiteSpace(numeroIdentificacion))
            query = query.Where(p => p.NumeroIdentificacion == numeroIdentificacion);

        if (aseguradoraId.HasValue)
            query = query.Where(p => p.AseguradoraId == aseguradoraId.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.NombresCompletos)
            .Skip((pagina - 1) * tamPagina)
            .Take(tamPagina)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<bool> ExisteIdentificacionAsync(
        byte tipoIdentificacionId, string numeroIdentificacion,
        int? excluirId = null, CancellationToken ct = default)
    {
        var query = _db.Pacientes.Where(p =>
            p.TipoIdentificacionId == tipoIdentificacionId &&
            p.NumeroIdentificacion == numeroIdentificacion);

        if (excluirId.HasValue)
            query = query.Where(p => p.Id != excluirId.Value);

        return await query.AnyAsync(ct);
    }
}

// ══════════════════════════════════════════════════════════════
//  PROFESIONAL REPOSITORIO
// ══════════════════════════════════════════════════════════════
public class ProfesionalRepositorio : RepositorioBase<Profesional>, IProfesionalRepositorio
{
    public ProfesionalRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<IList<Profesional>> ObtenerPorEspecialidadAsync(
        int especialidadId, CancellationToken ct = default)
    {
        return await _db.Profesionales
            .Include(p => p.Especialidad)
            .Include(p => p.Sede)
            .Include(p => p.TipoIdentificacion)
            .Where(p => p.EspecialidadId == especialidadId && p.Activo)
            .OrderBy(p => p.NombresCompletos)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<IList<Profesional>> ObtenerPorSedeAsync(
        int sedeId, CancellationToken ct = default)
    {
        return await _db.Profesionales
            .Include(p => p.Especialidad)
            .Include(p => p.Sede)
            .Where(p => p.SedeId == sedeId && p.Activo)
            .OrderBy(p => p.NombresCompletos)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<bool> ExisteIdentificacionAsync(
        byte tipoIdentificacionId, string numeroIdentificacion,
        int? excluirId = null, CancellationToken ct = default)
    {
        var query = _db.Profesionales.Where(p =>
            p.TipoIdentificacionId == tipoIdentificacionId &&
            p.NumeroIdentificacion == numeroIdentificacion);

        if (excluirId.HasValue)
            query = query.Where(p => p.Id != excluirId.Value);

        return await query.AnyAsync(ct);
    }
}

// ══════════════════════════════════════════════════════════════
//  REPOSITORIOS DE CATÁLOGO
// ══════════════════════════════════════════════════════════════
public class EspecialidadRepositorio
    : RepositorioBase<Especialidad>, IEspecialidadRepositorio
{
    public EspecialidadRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<IList<Especialidad>> ObtenerActivasAsync(
        CancellationToken ct = default)
        => await _db.Especialidades
            .Where(e => e.Activo)
            .OrderBy(e => e.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);
}

public class SedeRepositorio : RepositorioBase<Sede>, ISedeRepositorio
{
    public SedeRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<IList<Sede>> ObtenerActivasAsync(CancellationToken ct = default)
        => await _db.Sedes
            .Where(s => s.Activo)
            .OrderBy(s => s.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);
}

public class TipoCitaRepositorio : RepositorioBase<TipoCita>, ITipoCitaRepositorio
{
    public TipoCitaRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<IList<TipoCita>> ObtenerActivasPorCategoriaAsync(
        string? categoria = null, CancellationToken ct = default)
    {
        var query = _db.TiposCita.Where(t => t.Activo).AsNoTracking();

        if (!string.IsNullOrWhiteSpace(categoria))
            query = query.Where(t => t.Categoria == categoria);

        return await query
            .OrderBy(t => t.Categoria)
            .ThenBy(t => t.Nombre)
            .ToListAsync(ct);
    }
}

// ══════════════════════════════════════════════════════════════
//  DISPONIBILIDAD PROFESIONAL (plantillas horarias)
// ══════════════════════════════════════════════════════════════
public class DisponibilidadProfesionalRepositorio
    : RepositorioBase<DisponibilidadProfesional>, IDisponibilidadRepositorio
{
    public DisponibilidadProfesionalRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<IList<DisponibilidadProfesional>> ObtenerTodasDelProfesionalAsync(
        int profesionalId, CancellationToken ct = default)
        => await _db.Disponibilidades
            .Include(d => d.Profesional)
                .ThenInclude(p => p!.Sede)
            .Where(d => d.ProfesionalId == profesionalId && d.Activo)
            .OrderBy(d => d.DiaSemana)
            .ThenBy(d => d.HoraInicio)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<IList<DisponibilidadProfesional>> ObtenerPorDiaAsync(
        int profesionalId, byte diaSemana, CancellationToken ct = default)
        => await _db.Disponibilidades
            .Where(d => d.ProfesionalId == profesionalId
                     && d.DiaSemana == (DiaSemana)diaSemana
                     && d.Activo)
            .OrderBy(d => d.HoraInicio)
            .AsNoTracking()
            .ToListAsync(ct);
}
