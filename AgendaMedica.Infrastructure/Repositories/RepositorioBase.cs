// ============================================================
//  AGENDA MÉDICA — REPOSITORIOS BASE + UNIT OF WORK (v1.2)
//  Proyecto : AgendaMedica.Infrastructure / Repositories
//  Archivo  : RepositorioBase.cs
// ============================================================
//  Corrección v1.2: eliminado ThenInclude(Departamento) en
//  AseguradoraRepositorio — EF genera columna fantasma
//  'DepartamentoCodigoDane' al hacer eager loading de la
//  relación Municipio→Departamento con PK de tipo string.
//  El nombre del departamento se obtiene desde el código
//  del municipio (primeros 2 dígitos) cuando se necesite.
// ============================================================

using System.Globalization;
using System.Text;
using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Interfaces;
using AgendaMedica.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AgendaMedica.Infrastructure.Repositories;

// ── Normalización de texto para búsquedas ─────────────────────
// Búsqueda insensible a mayúsculas/minúsculas y a acentos.
// El término se normaliza en C# (FormD + ToUpperInvariant) y la
// columna se normaliza en SQL con unaccent() + ILIKE de Npgsql.
public static class NormalizacionTexto
{
    public static string Normalizar(string texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return string.Empty;
        var formD = texto.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var ch in formD)
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        return sb.ToString().ToUpperInvariant();
    }
}

// ── Repositorio base genérico ─────────────────────────────────
public class RepositorioBase<T> : IRepositorio<T> where T : EntidadBase
{
    protected readonly AgendaDbContext _db;
    protected readonly DbSet<T>        _set;

    public RepositorioBase(AgendaDbContext db) { _db = db; _set = db.Set<T>(); }

    public virtual async Task<T?> ObtenerPorIdAsync(int id, CancellationToken ct = default)
        => await _set.FindAsync(new object[] { id }, ct);

    public virtual async Task<IList<T>> ObtenerTodosAsync(CancellationToken ct = default)
        => await _set.ToListAsync(ct);

    public async Task AgregarAsync(T entidad, CancellationToken ct = default)
        => await _set.AddAsync(entidad, ct);

    public void Actualizar(T entidad) => _set.Update(entidad);
    public void Eliminar(T entidad)   => _set.Remove(entidad);
}

// ── DepartamentoRepositorio ───────────────────────────────────
public class DepartamentoRepositorio : IDepartamentoRepositorio
{
    private readonly AgendaDbContext _db;
    public DepartamentoRepositorio(AgendaDbContext db) => _db = db;

    public async Task<IList<Departamento>> ObtenerTodosAsync(CancellationToken ct = default)
        => await _db.Departamentos
            .Where(d => d.Activo)
            .OrderBy(d => d.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<Departamento?> ObtenerPorCodigoAsync(
        string codigoDane, CancellationToken ct = default)
        => await _db.Departamentos
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.CodigoDane == codigoDane, ct);
}

// ── MunicipioRepositorio ──────────────────────────────────────
// SIN ThenInclude(Departamento) para evitar el bug de EF Core
// con claves primarias de tipo string
public class MunicipioRepositorio : IMunicipioRepositorio
{
    private readonly AgendaDbContext _db;
    public MunicipioRepositorio(AgendaDbContext db) => _db = db;

    public async Task<IList<Municipio>> ObtenerPorDepartamentoAsync(
        string codigoDepartamento, CancellationToken ct = default)
        => await _db.Municipios
            .Where(m => m.CodigoDepartamento == codigoDepartamento && m.Activo)
            .OrderBy(m => m.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<Municipio?> ObtenerPorCodigoAsync(
        string codigoDane, CancellationToken ct = default)
        => await _db.Municipios
            .AsNoTracking()   // ← sin Include Departamento
            .FirstOrDefaultAsync(m => m.CodigoDane == codigoDane, ct);

    public async Task<IList<Municipio>> BuscarAsync(
        string nombre, CancellationToken ct = default)
    {
        var termino = NormalizacionTexto.Normalizar(nombre);
        return await _db.Municipios
            .Where(m => EF.Functions.ILike(
                    EF.Functions.Unaccent(m.Nombre), $"%{termino}%") && m.Activo)
            .OrderBy(m => m.Nombre)
            .Take(20)
            .AsNoTracking()
            .ToListAsync(ct);
    }
}

// ── TipoEntidadRepositorio ────────────────────────────────────
public class TipoEntidadRepositorio : ITipoEntidadRepositorio
{
    private readonly AgendaDbContext _db;
    public TipoEntidadRepositorio(AgendaDbContext db) => _db = db;

    public async Task<IList<TipoEntidad>> ObtenerTodosAsync(CancellationToken ct = default)
        => await _db.TiposEntidad
            .Where(t => t.Activo)
            .OrderBy(t => t.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<TipoEntidad?> ObtenerPorIdAsync(byte id, CancellationToken ct = default)
        => await _db.TiposEntidad.FindAsync(new object[] { id }, ct);
}

// ── TipoUsuarioRepositorio ────────────────────────────────────
public class TipoUsuarioRepositorio : ITipoUsuarioRepositorio
{
    private readonly AgendaDbContext _db;
    public TipoUsuarioRepositorio(AgendaDbContext db) => _db = db;

    public async Task<IList<TipoUsuario>> ObtenerTodosAsync(CancellationToken ct = default)
        => await _db.TiposUsuario
            .Where(t => t.Activo)
            .OrderBy(t => t.Id)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<TipoUsuario?> ObtenerPorIdAsync(byte id, CancellationToken ct = default)
        => await _db.TiposUsuario.FindAsync(new object[] { id }, ct);
}

// ── TipoIdentificacionRepositorio ────────────────────────────
public class TipoIdentificacionRepositorio : ITipoIdentificacionRepositorio
{
    private readonly AgendaDbContext _db;
    public TipoIdentificacionRepositorio(AgendaDbContext db) => _db = db;

    public async Task<TipoIdentificacion?> ObtenerPorIdAsync(
        byte id, CancellationToken ct = default)
        => await _db.TiposIdentificacion.FindAsync(new object[] { id }, ct);

    public async Task<IList<TipoIdentificacion>> ObtenerTodosAsync(CancellationToken ct = default)
        => await _db.TiposIdentificacion
            .Where(t => t.Activo)
            .OrderBy(t => t.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);
}

// ── AseguradoraRepositorio ────────────────────────────────────
// SIN ThenInclude(Departamento) — genera DepartamentoCodigoDane
public class AseguradoraRepositorio
    : RepositorioBase<Aseguradora>, IAseguradoraRepositorio
{
    public AseguradoraRepositorio(AgendaDbContext db) : base(db) { }

    public async Task<IList<Aseguradora>> ObtenerActivasAsync(
        CancellationToken ct = default)
        => await _db.Aseguradoras
            .Include(a => a.TipoEntidad)
            .Include(a => a.Municipio)   // ← solo Municipio, sin ThenInclude
            .Where(a => a.Activo)
            .OrderBy(a => a.Nombre)
            .AsNoTracking()
            .ToListAsync(ct);

    public async Task<IList<Aseguradora>> BuscarAsync(
        string? nombre = null, byte? tipoEntidadId = null,
        CancellationToken ct = default)
    {
        var q = _db.Aseguradoras
            .Include(a => a.TipoEntidad)
            .Include(a => a.Municipio)   // ← solo Municipio, sin ThenInclude
            .Where(a => a.Activo)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            var termino = NormalizacionTexto.Normalizar(nombre);
            q = q.Where(a => EF.Functions.ILike(
                             EF.Functions.Unaccent(a.Nombre), $"%{termino}%")
                          || EF.Functions.ILike(
                             EF.Functions.Unaccent(a.Sigla), $"%{termino}%"));
        }

        if (tipoEntidadId.HasValue)
            q = q.Where(a => a.TipoEntidadId == tipoEntidadId.Value);

        return await q.OrderBy(a => a.Nombre).Take(50).ToListAsync(ct);
    }

    public async Task<Aseguradora?> ObtenerPorCodigoAsync(
        string codigo, CancellationToken ct = default)
        => await _db.Aseguradoras
            .Include(a => a.TipoEntidad)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Codigo == codigo, ct);
}

// ── UnitOfWork ────────────────────────────────────────────────
public class UnitOfWork : IUnitOfWork
{
    private readonly AgendaDbContext _db;

    private ICitaRepositorio?               _citas;
    private IPacienteRepositorio?           _pacientes;
    private IProfesionalRepositorio?        _profesionales;
    private IDisponibilidadRepositorio?     _disponibilidades;
    private IBloqueoAgendaRepositorio?      _bloqueosAgenda;
    private IExcepcionHorariaRepositorio?   _excepcionesHorarias;
    private IAseguradoraRepositorio?        _aseguradoras;
    private IEspecialidadRepositorio?       _especialidades;
    private ISedeRepositorio?               _sedes;
    private ITipoCitaRepositorio?           _tiposCita;
    private IMotivoCancelacionRepositorio?  _motivosCancelacion;
    private IDepartamentoRepositorio?       _departamentos;
    private IMunicipioRepositorio?          _municipios;
    private ITipoEntidadRepositorio?        _tiposEntidad;
    private ITipoUsuarioRepositorio?        _tiposUsuario;
    private ITipoIdentificacionRepositorio? _tiposIdentificacion;

    public UnitOfWork(AgendaDbContext db) => _db = db;

    public ICitaRepositorio         Citas          => _citas         ??= new CitaRepositorio(_db);
    public IPacienteRepositorio     Pacientes      => _pacientes     ??= new PacienteRepositorio(_db);
    public IProfesionalRepositorio  Profesionales  => _profesionales ??= new ProfesionalRepositorio(_db);
    public IDisponibilidadRepositorio Disponibilidades
        => _disponibilidades ??= new DisponibilidadProfesionalRepositorio(_db);
    public IBloqueoAgendaRepositorio BloqueosAgenda
        => _bloqueosAgenda ??= new BloqueoAgendaRepositorio(_db);
    public IExcepcionHorariaRepositorio ExcepcionesHorarias
        => _excepcionesHorarias ??= new ExcepcionHorariaRepositorio(_db);
    public IAseguradoraRepositorio  Aseguradoras   => _aseguradoras  ??= new AseguradoraRepositorio(_db);
    public IEspecialidadRepositorio Especialidades => _especialidades??= new EspecialidadRepositorio(_db);
    public ISedeRepositorio         Sedes          => _sedes         ??= new SedeRepositorio(_db);
    public ITipoCitaRepositorio     TiposCita      => _tiposCita     ??= new TipoCitaRepositorio(_db);
    public IMotivoCancelacionRepositorio MotivosCancelacion
        => _motivosCancelacion ??= new MotivoCancelacionRepositorio(_db);
    public IDepartamentoRepositorio Departamentos  => _departamentos ??= new DepartamentoRepositorio(_db);
    public IMunicipioRepositorio    Municipios     => _municipios    ??= new MunicipioRepositorio(_db);
    public ITipoEntidadRepositorio  TiposEntidad   => _tiposEntidad  ??= new TipoEntidadRepositorio(_db);
    public ITipoUsuarioRepositorio  TiposUsuario   => _tiposUsuario  ??= new TipoUsuarioRepositorio(_db);
    public ITipoIdentificacionRepositorio TiposIdentificacion
        => _tiposIdentificacion ??= new TipoIdentificacionRepositorio(_db);

    public async Task<int> GuardarAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    public async ValueTask DisposeAsync() => await _db.DisposeAsync();
}
