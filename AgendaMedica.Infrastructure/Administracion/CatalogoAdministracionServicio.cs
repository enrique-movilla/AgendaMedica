// ============================================================
//  AGENDA MÉDICA — ADMINISTRACIÓN DE CATÁLOGOS (FASE 1 · 2)
//  Proyecto : AgendaMedica.Infrastructure / Administracion
//  Archivo  : CatalogoAdministracionServicio.cs
// ============================================================
//  Implementa el contrato IAdministracionCatalogos mediante el
//  patrón ADAPTADOR:
//
//    CatalogoAdaptadorBase<T>  → lógica genérica reutilizable
//      (listar / crear / actualizar / inactivar / activar /
//       borrar con dependencias / verificar duplicados / conteos)
//
//    Los adaptadores concretos aportan metadatos, serialización,
//    validaciones y dependencias (~40-60 líneas c/u).
//
//  Generalización (Fase 2):
//    - El Id se expone como string (admite PK numéricas y de texto
//      como CodigoDane de Departamento/Municipio).
//    - La actividad (Activo) es opcional: EstadoCita no la tiene.
//    - Las definiciones incluyen conteos activos/inactivos y un
//      filtro por catálogo padre (Municipio → Departamento).
//
//  Para añadir un catálogo nuevo se crea su adaptador y se registra
//  en CatalogoAdministracionServicio: el controlador y el frontend
//  no cambian.
// ============================================================

using System.Linq.Expressions;
using System.Text.Json;
using AgendaMedica.Domain;
using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Infrastructure.Data;
using AgendaMedica.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AgendaMedica.Infrastructure.Administracion;

// ── Lectura de valores del formulario (JSON) ───────────────────
internal static class CatalogoValores
{
    public static string Texto(IDictionary<string, object?> v, string clave)
    {
        var valor = Desenvolver(v, clave);
        return valor as string ?? Convert.ToString(valor) ?? string.Empty;
    }

    public static string? TextoNulo(IDictionary<string, object?> v, string clave)
    {
        var texto = Texto(v, clave);
        return string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
    }

    public static int Entero(IDictionary<string, object?> v, string clave)
    {
        var valor = Desenvolver(v, clave);
        if (valor is null) return 0;
        try { return Convert.ToInt32(valor); }
        catch { return int.TryParse(Convert.ToString(valor), out var i) ? i : 0; }
    }

    public static bool Logico(IDictionary<string, object?> v, string clave)
    {
        var valor = Desenvolver(v, clave);
        return valor is bool b ? b : Convert.ToBoolean(valor);
    }

    /// <summary>Convierte JsonElement (envío del body) a tipos CLR.</summary>
    private static object? Desenvolver(IDictionary<string, object?> v, string clave)
    {
        if (!v.TryGetValue(clave, out var valor)) return null;
        if (valor is not JsonElement je) return valor;

        return je.ValueKind switch
        {
            JsonValueKind.String  => je.GetString(),
            JsonValueKind.Number  => je.TryGetInt64(out var i) ? i : je.GetDecimal(),
            JsonValueKind.True    => true,
            JsonValueKind.False   => false,
            JsonValueKind.Null    => null,
            _                     => valor
        };
    }
}

// ── Interfaz interna del adaptador (no genérica) ───────────────
internal interface ICatalogoAdaptador
{
    CatalogoDefinicion Definicion { get; }

    Task<(int Activos, int Inactivos)> ContarAsync(CancellationToken ct);
    Task<ResultadoCatalogo> ListarAsync(
        string? termino, string? filtroPadre, int pagina, int tamPagina, bool soloActivos,
        CancellationToken ct);

    Task<CatalogoFila> ObtenerPorIdAsync(string id, CancellationToken ct);
    Task<CatalogoFila> CrearAsync(IDictionary<string, object?> valores, CancellationToken ct);
    Task<CatalogoFila> ActualizarAsync(string id, IDictionary<string, object?> valores, CancellationToken ct);
    Task InactivarAsync(string id, CancellationToken ct);
    Task ActivarAsync(string id, CancellationToken ct);
    Task BorrarAsync(string id, CancellationToken ct);
    Task<IReadOnlyList<DependenciaCatalogo>> DependenciasAsync(string id, CancellationToken ct);
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR BASE GENÉRICO (reutilizable)
// ══════════════════════════════════════════════════════════════
internal abstract class CatalogoAdaptadorBase<TEntidad> : ICatalogoAdaptador
    where TEntidad : class
{
    protected readonly AgendaDbContext Contexto;
    protected readonly DbSet<TEntidad> Set;

    protected CatalogoAdaptadorBase(AgendaDbContext contexto)
    {
        Contexto = contexto;
        Set = contexto.Set<TEntidad>();
    }

    public abstract CatalogoDefinicion Definicion { get; }

    /// <summary>Propiedad de texto usada para ordenar y buscar (p. ej. "Nombre").</summary>
    protected abstract string CampoOrdenYBusqueda { get; }

    /// <summary>Indica si el catálogo tiene columna Activo (false p. ej. para EstadoCita).</summary>
    protected virtual bool TieneActivo => true;

    /// <summary>Campo usado para filtrar por catálogo padre (null si no aplica).</summary>
    protected virtual string? CampoFiltroPadre => null;

    /// <summary>Id de la fila como texto (int.ToString(), CodigoDane, etc.).</summary>
    protected abstract string IdTexto(TEntidad entidad);

    /// <summary>Predicado de búsqueda por Id (clave primaria).</summary>
    protected abstract Expression<Func<TEntidad, bool>> PredicadoPorId(string id);

    // ── Serialización entidad → diccionario ────────────────────
    protected abstract IReadOnlyDictionary<string, object?> EscribirValores(TEntidad entidad);

    // ── Materialización desde el formulario ─────────────────────
    protected abstract TEntidad CrearDesde(IDictionary<string, object?> valores);
    protected abstract void Sobreescribir(TEntidad entidad, IDictionary<string, object?> valores);

    // ── Reglas por catálogo ─────────────────────────────────────
    protected abstract Task<bool> ExisteDuplicadoAsync(IDictionary<string, object?> valores, string? excluirId, CancellationToken ct);
    protected abstract Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(TEntidad entidad, CancellationToken ct);

    // ── Conteos activos/inactivos ───────────────────────────────
    public async Task<(int Activos, int Inactivos)> ContarAsync(CancellationToken ct)
    {
        if (!TieneActivo)
            return (await Set.CountAsync(ct), 0);

        // Una sola query: CAST/CASE agrupado por Activo.
        var grupos = await Set.AsNoTracking()
            .GroupBy(e => EF.Property<bool>(e, "Activo"))
            .Select(g => new { EsActivo = g.Key, N = g.Count() })
            .ToListAsync(ct);

        var activos   = grupos.Where(g => g.EsActivo).Sum(g => g.N);
        var inactivos = grupos.Where(g => !g.EsActivo).Sum(g => g.N);
        return (activos, inactivos);
    }

    // ── Operaciones comunes ─────────────────────────────────────
    public async Task<ResultadoCatalogo> ListarAsync(
        string? termino, string? filtroPadre, int pagina, int tamPagina, bool soloActivos,
        CancellationToken ct)
    {
        pagina    = Math.Max(1, pagina);
        tamPagina = Math.Clamp(tamPagina, 1, 100);

        var query = Set.AsNoTracking().AsQueryable();
        if (soloActivos && TieneActivo)
            query = query.Where(e => EF.Property<bool>(e, "Activo"));

        if (!string.IsNullOrWhiteSpace(filtroPadre) && CampoFiltroPadre != null)
            query = query.Where(e => EF.Property<string>(e, CampoFiltroPadre) == filtroPadre);

        if (!string.IsNullOrWhiteSpace(termino))
        {
            var t = NormalizacionTexto.Normalizar(termino);
            query = query.Where(e => EF.Functions.ILike(
                EF.Functions.Unaccent(EF.Property<string>(e, CampoOrdenYBusqueda)),
                $"%{t}%"));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(e => EF.Property<string>(e, CampoOrdenYBusqueda))
            .Skip((pagina - 1) * tamPagina)
            .Take(tamPagina)
            .AsNoTracking()
            .ToListAsync(ct);

        var filas = items.Select(e => new CatalogoFila(IdTexto(e), EscribirValores(e))).ToList();
        return new ResultadoCatalogo(filas, total, pagina, tamPagina,
            tamPagina == 0 ? 0 : (int)Math.Ceiling(total / (double)tamPagina));
    }

    public async Task<CatalogoFila> ObtenerPorIdAsync(string id, CancellationToken ct)
    {
        var entidad = await Set.AsNoTracking().FirstOrDefaultAsync(PredicadoPorId(id), ct)
            ?? throw new EntidadNoEncontradaException(Definicion.Etiqueta, id);
        return new CatalogoFila(id, EscribirValores(entidad));
    }

    public async Task<CatalogoFila> CrearAsync(IDictionary<string, object?> valores, CancellationToken ct)
    {
        try
        {
            if (await ExisteDuplicadoAsync(valores, null, ct))
                throw new EntidadDuplicadaException(Definicion.Etiqueta.ToLowerInvariant(),
                    "los datos indicados");

            var entidad = CrearDesde(valores);
            await Set.AddAsync(entidad, ct);
            await Contexto.SaveChangesAsync(ct);
            return new CatalogoFila(IdTexto(entidad), EscribirValores(entidad));
        }
        catch (ArgumentException ex)
        {
            throw new DomainException(ex.Message);
        }
    }

    public async Task<CatalogoFila> ActualizarAsync(string id, IDictionary<string, object?> valores, CancellationToken ct)
    {
        try
        {
            var entidad = await Set.FirstOrDefaultAsync(PredicadoPorId(id), ct)
                ?? throw new EntidadNoEncontradaException(Definicion.Etiqueta, id);

            if (await ExisteDuplicadoAsync(valores, id, ct))
                throw new EntidadDuplicadaException(Definicion.Etiqueta.ToLowerInvariant(),
                    "los datos indicados");

            Sobreescribir(entidad, valores);
            await Contexto.SaveChangesAsync(ct);
            return new CatalogoFila(IdTexto(entidad), EscribirValores(entidad));
        }
        catch (ArgumentException ex)
        {
            throw new DomainException(ex.Message);
        }
    }

    public async Task InactivarAsync(string id, CancellationToken ct)
    {
        if (!TieneActivo)
            throw new DomainException($"El catálogo {Definicion.Etiqueta} no admite desactivar registros.");

        var entidad = await Set.FirstOrDefaultAsync(PredicadoPorId(id), ct)
            ?? throw new EntidadNoEncontradaException(Definicion.Etiqueta, id);
        Contexto.Entry(entidad).Property("Activo").CurrentValue = false;
        await Contexto.SaveChangesAsync(ct);
    }

    public async Task ActivarAsync(string id, CancellationToken ct)
    {
        if (!TieneActivo)
            throw new DomainException($"El catálogo {Definicion.Etiqueta} no admite activar registros.");

        var entidad = await Set.FirstOrDefaultAsync(PredicadoPorId(id), ct)
            ?? throw new EntidadNoEncontradaException(Definicion.Etiqueta, id);
        Contexto.Entry(entidad).Property("Activo").CurrentValue = true;
        await Contexto.SaveChangesAsync(ct);
    }

    public async Task BorrarAsync(string id, CancellationToken ct)
    {
        var entidad = await Set.FirstOrDefaultAsync(PredicadoPorId(id), ct)
            ?? throw new EntidadNoEncontradaException(Definicion.Etiqueta, id);

        var dependencias = await ContarDependenciasAsync(entidad, ct);
        var conRef = dependencias.Where(d => d.Conteo > 0).ToList();
        if (conRef.Count > 0)
        {
            var detalle = string.Join(", ", conRef.Select(d => $"{d.Descripcion} ({d.Conteo})"));
            throw new DomainException($"No se puede borrar: {Definicion.Etiqueta.ToLowerInvariant()} está en uso por {detalle}. Puede desactivarlo.");
        }

        Set.Remove(entidad);
        await Contexto.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<DependenciaCatalogo>> DependenciasAsync(string id, CancellationToken ct)
    {
        var entidad = await Set.AsNoTracking().FirstOrDefaultAsync(PredicadoPorId(id), ct)
            ?? throw new EntidadNoEncontradaException(Definicion.Etiqueta, id);
        return await ContarDependenciasAsync(entidad, ct);
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: MOTIVO DE CANCELACIÓN
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorMotivoCancelacion : CatalogoAdaptadorBase<MotivoCancelacion>
{
    public AdaptadorMotivoCancelacion(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        Tabla:            "motivos-cancelacion",
        Etiqueta:         "Motivos de cancelación",
        Descripcion:      "Categorías de motivos para cancelar una cita médica.",
        CampoPrincipal:   "nombre",
        Campos:
        [
            new("nombre",      "Nombre",      TipoCampoCatalogo.Texto, Requerido: true),
            new("descripcion", "Descripción", TipoCampoCatalogo.Texto, Requerido: false),
            new("orden",       "Orden",       TipoCampoCatalogo.Numero, Requerido: false),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(MotivoCancelacion m) => m.Id.ToString();
    protected override Expression<Func<MotivoCancelacion, bool>> PredicadoPorId(string id)
        => m => m.Id == int.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(MotivoCancelacion m)
        => new Dictionary<string, object?>
        {
            ["nombre"]      = m.Nombre,
            ["descripcion"] = m.Descripcion,
            ["orden"]       = m.Orden,
            ["activo"]      = m.Activo,
        };

    protected override MotivoCancelacion CrearDesde(IDictionary<string, object?> valores)
        => new MotivoCancelacion(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "descripcion"),
            (short)CatalogoValores.Entero(valores, "orden"));

    protected override void Sobreescribir(MotivoCancelacion entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "descripcion"),
            (short)CatalogoValores.Entero(valores, "orden"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var nombre = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "nombre"));
        var query = Set.Where(m => EF.Functions.ILike(
            EF.Functions.Unaccent(m.Nombre), nombre));
        if (excluirId is not null) query = query.Where(m => m.Id != int.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        MotivoCancelacion entidad, CancellationToken ct)
    {
        // No tiene dependencias foráneas (el motivo se guarda como texto en HistorialEstadoCita)
        return Task.FromResult<IReadOnlyList<DependenciaCatalogo>>([]);
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: ESPECIALIDAD
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorEspecialidad : CatalogoAdaptadorBase<Especialidad>
{
    public AdaptadorEspecialidad(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        Tabla:            "especialidades",
        Etiqueta:         "Especialidades",
        Descripcion:      "Especialidades médicas de los profesionales.",
        CampoPrincipal:   "nombre",
        Campos:
        [
            new("nombre",      "Nombre",      TipoCampoCatalogo.Texto, Requerido: true),
            new("descripcion", "Descripción", TipoCampoCatalogo.Texto, Requerido: false),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(Especialidad e) => e.Id.ToString();
    protected override Expression<Func<Especialidad, bool>> PredicadoPorId(string id)
        => e => e.Id == int.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(Especialidad e)
        => new Dictionary<string, object?>
        {
            ["nombre"]      = e.Nombre,
            ["descripcion"] = e.Descripcion,
            ["activo"]      = e.Activo,
        };

    protected override Especialidad CrearDesde(IDictionary<string, object?> valores)
        => new Especialidad(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "descripcion"));

    protected override void Sobreescribir(Especialidad entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "descripcion"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var nombre = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "nombre"));
        var query = Set.Where(e => EF.Functions.ILike(
            EF.Functions.Unaccent(e.Nombre), nombre));
        if (excluirId is not null) query = query.Where(e => e.Id != int.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        Especialidad entidad, CancellationToken ct)
    {
        var count = await Contexto.Profesionales.CountAsync(p => p.EspecialidadId == entidad.Id, ct);
        return [ new DependenciaCatalogo("Profesionales", "Profesionales asignados", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: TIPO DE CITA
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorTipoCita : CatalogoAdaptadorBase<TipoCita>
{
    public AdaptadorTipoCita(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "tipos-cita",
        "Tipos de cita",
        "Tipos de atención y su configuración de duración/validación.",
        "nombre",
        [
            new CampoCatalogo("nombre",              "Nombre",             TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("categoria",           "Categoría",          TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("duracionMinutos",     "Duración (minutos)", TipoCampoCatalogo.Numero, Requerido: true),
            new CampoCatalogo("requiereValidacion",  "Requiere validación",TipoCampoCatalogo.Logico, Requerido: false),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(TipoCita t) => t.Id.ToString();
    protected override Expression<Func<TipoCita, bool>> PredicadoPorId(string id)
        => t => t.Id == int.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(TipoCita t)
        => new Dictionary<string, object?>
        {
            ["nombre"]             = t.Nombre,
            ["categoria"]          = t.Categoria,
            ["duracionMinutos"]    = t.DuracionMinutos,
            ["requiereValidacion"] = t.RequiereValidacion,
            ["activo"]             = t.Activo,
        };

    protected override TipoCita CrearDesde(IDictionary<string, object?> valores)
        => new TipoCita(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.Texto(valores, "categoria"),
            (short)CatalogoValores.Entero(valores, "duracionMinutos"),
            CatalogoValores.Logico(valores, "requiereValidacion"));

    protected override void Sobreescribir(TipoCita entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.Texto(valores, "categoria"),
            (short)CatalogoValores.Entero(valores, "duracionMinutos"),
            CatalogoValores.Logico(valores, "requiereValidacion"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var nombre = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "nombre"));
        var query = Set.Where(t => EF.Functions.ILike(
            EF.Functions.Unaccent(t.Nombre), nombre));
        if (excluirId is not null) query = query.Where(t => t.Id != int.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        TipoCita entidad, CancellationToken ct)
    {
        var count = await Contexto.Citas.CountAsync(c => c.TipoCitaId == entidad.Id, ct);
        return [ new DependenciaCatalogo("Citas", "Citas programadas", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: SEDE
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorSede : CatalogoAdaptadorBase<Sede>
{
    public AdaptadorSede(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "sedes",
        "Sedes",
        "Puntos de atención donde trabajan los profesionales.",
        "nombre",
        [
            new CampoCatalogo("nombre",    "Nombre",    TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("direccion", "Dirección", TipoCampoCatalogo.Texto,  Requerido: false),
            new CampoCatalogo("ciudad",    "Ciudad",    TipoCampoCatalogo.Texto,  Requerido: false),
            new CampoCatalogo("telefono",  "Teléfono",  TipoCampoCatalogo.Texto,  Requerido: false),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(Sede s) => s.Id.ToString();
    protected override Expression<Func<Sede, bool>> PredicadoPorId(string id)
        => s => s.Id == int.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(Sede s)
        => new Dictionary<string, object?>
        {
            ["nombre"]    = s.Nombre,
            ["direccion"] = s.Direccion,
            ["ciudad"]    = s.Ciudad,
            ["telefono"]  = s.Telefono,
            ["activo"]    = s.Activo,
        };

    protected override Sede CrearDesde(IDictionary<string, object?> valores)
        => new Sede(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "direccion"),
            CatalogoValores.TextoNulo(valores, "ciudad"),
            CatalogoValores.TextoNulo(valores, "telefono"));

    protected override void Sobreescribir(Sede entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "direccion"),
            CatalogoValores.TextoNulo(valores, "ciudad"),
            CatalogoValores.TextoNulo(valores, "telefono"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var nombre = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "nombre"));
        var query = Set.Where(s => EF.Functions.ILike(
            EF.Functions.Unaccent(s.Nombre), nombre));
        if (excluirId is not null) query = query.Where(s => s.Id != int.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        Sede entidad, CancellationToken ct)
    {
        var count = await Contexto.Profesionales.CountAsync(p => p.SedeId == entidad.Id, ct);
        return [ new DependenciaCatalogo("Profesionales", "Profesionales asignados", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: ASEGURADORA
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorAseguradora : CatalogoAdaptadorBase<Aseguradora>
{
    public AdaptadorAseguradora(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "aseguradoras",
        "Aseguradoras",
        "EPS, IPS y demás entidades aseguradoras.",
        "nombre",
        [
            new CampoCatalogo("tipoEntidadId",   "Tipo de entidad (Id)", TipoCampoCatalogo.Numero, Requerido: true),
            new CampoCatalogo("codigo",          "Código",               TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("sigla",           "Sigla",                TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("nombre",          "Nombre",               TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("gerente",         "Gerente",              TipoCampoCatalogo.Texto,  Requerido: false),
            new CampoCatalogo("codigoMunicipio", "Código municipio",     TipoCampoCatalogo.Texto,  Requerido: false),
            new CampoCatalogo("direccion",       "Dirección",            TipoCampoCatalogo.Texto,  Requerido: false),
            new CampoCatalogo("telefono",        "Teléfono",             TipoCampoCatalogo.Texto,  Requerido: false),
            new CampoCatalogo("email",           "Email",                TipoCampoCatalogo.Texto,  Requerido: false),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(Aseguradora a) => a.Id.ToString();
    protected override Expression<Func<Aseguradora, bool>> PredicadoPorId(string id)
        => a => a.Id == int.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(Aseguradora a)
        => new Dictionary<string, object?>
        {
            ["tipoEntidadId"]   = a.TipoEntidadId,
            ["codigo"]          = a.Codigo,
            ["sigla"]           = a.Sigla,
            ["nombre"]          = a.Nombre,
            ["gerente"]         = a.Gerente,
            ["codigoMunicipio"] = a.CodigoMunicipio,
            ["direccion"]       = a.Direccion,
            ["telefono"]        = a.Telefono,
            ["email"]           = a.Email,
            ["activo"]          = a.Activo,
        };

    protected override Aseguradora CrearDesde(IDictionary<string, object?> valores)
        => new Aseguradora(
            (byte)CatalogoValores.Entero(valores, "tipoEntidadId"),
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "sigla"),
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "gerente"),
            CatalogoValores.TextoNulo(valores, "codigoMunicipio"),
            CatalogoValores.TextoNulo(valores, "direccion"),
            CatalogoValores.TextoNulo(valores, "telefono"),
            CatalogoValores.TextoNulo(valores, "email"));

    protected override void Sobreescribir(Aseguradora entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "sigla"),
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "gerente"),
            CatalogoValores.TextoNulo(valores, "codigoMunicipio"),
            CatalogoValores.TextoNulo(valores, "direccion"),
            CatalogoValores.TextoNulo(valores, "telefono"),
            CatalogoValores.TextoNulo(valores, "email"),
            CatalogoValores.TextoNulo(valores, "url"),
            CatalogoValores.TextoNulo(valores, "urlRed"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var codigo = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "codigo"));
        var query = Set.Where(a => EF.Functions.ILike(
            EF.Functions.Unaccent(a.Codigo), codigo));
        if (excluirId is not null) query = query.Where(a => a.Id != int.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        Aseguradora entidad, CancellationToken ct)
    {
        var pacientes = await Contexto.Pacientes.CountAsync(p => p.AseguradoraId == entidad.Id, ct);
        var citas     = await Contexto.Citas.CountAsync(c => c.AseguradoraId == entidad.Id, ct);
        return
        [
            new DependenciaCatalogo("Pacientes", "Pacientes afiliados", pacientes),
            new DependenciaCatalogo("Citas",     "Citas asociadas",     citas),
        ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: TIPO DE IDENTIFICACIÓN
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorTipoIdentificacion : CatalogoAdaptadorBase<TipoIdentificacion>
{
    public AdaptadorTipoIdentificacion(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "tipos-identificacion",
        "Tipos de identificación",
        "Tipos de documento de identidad (CC, TI, CE, etc.).",
        "nombre",
        [
            new CampoCatalogo("id",     "Id",     TipoCampoCatalogo.Numero, Requerido: true),
            new CampoCatalogo("codigo", "Código", TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("nombre", "Nombre", TipoCampoCatalogo.Texto,  Requerido: true),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(TipoIdentificacion t) => t.Id.ToString();
    protected override Expression<Func<TipoIdentificacion, bool>> PredicadoPorId(string id)
        => t => t.Id == byte.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(TipoIdentificacion t)
        => new Dictionary<string, object?>
        {
            ["id"]     = t.Id,
            ["codigo"] = t.Codigo,
            ["nombre"] = t.Nombre,
            ["activo"] = t.Activo,
        };

    protected override TipoIdentificacion CrearDesde(IDictionary<string, object?> valores)
        => new TipoIdentificacion(
            (byte)CatalogoValores.Entero(valores, "id"),
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "nombre"));

    protected override void Sobreescribir(TipoIdentificacion entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "nombre"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var codigo = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "codigo"));
        var query = Set.Where(t => EF.Functions.ILike(
            EF.Functions.Unaccent(t.Codigo), codigo));
        if (excluirId is not null) query = query.Where(t => t.Id != byte.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        TipoIdentificacion entidad, CancellationToken ct)
    {
        var pacientes    = await Contexto.Pacientes.CountAsync(p => p.TipoIdentificacionId == entidad.Id, ct);
        var profesionales = await Contexto.Profesionales.CountAsync(p => p.TipoIdentificacionId == entidad.Id, ct);
        return
        [
            new DependenciaCatalogo("Pacientes",    "Pacientes con este tipo",    pacientes),
            new DependenciaCatalogo("Profesionales","Profesionales con este tipo", profesionales),
        ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: TIPO DE ENTIDAD
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorTipoEntidad : CatalogoAdaptadorBase<TipoEntidad>
{
    public AdaptadorTipoEntidad(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "tipos-entidad",
        "Tipos de entidad",
        "Clasificación de las entidades aseguradoras (EPS, IPS, etc.).",
        "nombre",
        [
            new CampoCatalogo("id",         "Id",           TipoCampoCatalogo.Numero, Requerido: true),
            new CampoCatalogo("codigo",     "Código",       TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("nombre",     "Nombre",       TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("otroNombre", "Otro nombre",  TipoCampoCatalogo.Texto,  Requerido: false),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(TipoEntidad t) => t.Id.ToString();
    protected override Expression<Func<TipoEntidad, bool>> PredicadoPorId(string id)
        => t => t.Id == byte.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(TipoEntidad t)
        => new Dictionary<string, object?>
        {
            ["id"]         = t.Id,
            ["codigo"]     = t.Codigo,
            ["nombre"]     = t.Nombre,
            ["otroNombre"] = t.OtroNombre,
            ["activo"]     = t.Activo,
        };

    protected override TipoEntidad CrearDesde(IDictionary<string, object?> valores)
        => new TipoEntidad(
            (byte)CatalogoValores.Entero(valores, "id"),
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "otroNombre"));

    protected override void Sobreescribir(TipoEntidad entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.TextoNulo(valores, "otroNombre"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var codigo = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "codigo"));
        var query = Set.Where(t => EF.Functions.ILike(
            EF.Functions.Unaccent(t.Codigo), codigo));
        if (excluirId is not null) query = query.Where(t => t.Id != byte.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        TipoEntidad entidad, CancellationToken ct)
    {
        var count = await Contexto.Aseguradoras.CountAsync(a => a.TipoEntidadId == entidad.Id, ct);
        return [ new DependenciaCatalogo("Aseguradoras", "Aseguradoras de este tipo", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: TIPO DE USUARIO
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorTipoUsuario : CatalogoAdaptadorBase<TipoUsuario>
{
    public AdaptadorTipoUsuario(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "tipos-usuario",
        "Tipos de usuario",
        "Régimen del usuario (Contributivo, Subsidiado, etc.).",
        "nombre",
        [
            new CampoCatalogo("id",     "Id",     TipoCampoCatalogo.Numero, Requerido: true),
            new CampoCatalogo("codigo", "Código", TipoCampoCatalogo.Texto,  Requerido: true),
            new CampoCatalogo("nombre", "Nombre", TipoCampoCatalogo.Texto,  Requerido: true),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(TipoUsuario t) => t.Id.ToString();
    protected override Expression<Func<TipoUsuario, bool>> PredicadoPorId(string id)
        => t => t.Id == byte.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(TipoUsuario t)
        => new Dictionary<string, object?>
        {
            ["id"]     = t.Id,
            ["codigo"] = t.Codigo,
            ["nombre"] = t.Nombre,
            ["activo"] = t.Activo,
        };

    protected override TipoUsuario CrearDesde(IDictionary<string, object?> valores)
        => new TipoUsuario(
            (byte)CatalogoValores.Entero(valores, "id"),
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "nombre"));

    protected override void Sobreescribir(TipoUsuario entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "codigo"),
            CatalogoValores.Texto(valores, "nombre"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var codigo = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "codigo"));
        var query = Set.Where(t => EF.Functions.ILike(
            EF.Functions.Unaccent(t.Codigo), codigo));
        if (excluirId is not null) query = query.Where(t => t.Id != byte.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        TipoUsuario entidad, CancellationToken ct)
    {
        var pacientes = await Contexto.Pacientes.CountAsync(p => p.TipoUsuarioId == entidad.Id, ct);
        var citas     = await Contexto.Citas.CountAsync(c => c.TipoUsuarioId == entidad.Id, ct);
        return
        [
            new DependenciaCatalogo("Pacientes", "Pacientes en este régimen", pacientes),
            new DependenciaCatalogo("Citas",     "Citas en este régimen",     citas),
        ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: DEPARTAMENTO (DIVIPOLA)
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorDepartamento : CatalogoAdaptadorBase<Departamento>
{
    public AdaptadorDepartamento(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "departamentos",
        "Departamentos",
        "División político-administrativa (DIVIPOLA).",
        "nombre",
        [
            new CampoCatalogo("codigoDane", "Código DANE", TipoCampoCatalogo.Texto, Requerido: true),
            new CampoCatalogo("nombre",     "Nombre",      TipoCampoCatalogo.Texto, Requerido: true),
        ]);

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(Departamento d) => d.CodigoDane;
    protected override Expression<Func<Departamento, bool>> PredicadoPorId(string id)
        => d => d.CodigoDane == id;

    protected override IReadOnlyDictionary<string, object?> EscribirValores(Departamento d)
        => new Dictionary<string, object?>
        {
            ["codigoDane"] = d.CodigoDane,
            ["nombre"]     = d.Nombre,
            ["activo"]     = d.Activo,
        };

    protected override Departamento CrearDesde(IDictionary<string, object?> valores)
        => new Departamento(
            CatalogoValores.Texto(valores, "codigoDane"),
            CatalogoValores.Texto(valores, "nombre"));

    protected override void Sobreescribir(Departamento entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(CatalogoValores.Texto(valores, "nombre"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var codigoDane = CatalogoValores.Texto(valores, "codigoDane").Trim().PadLeft(2, '0');
        var query = Set.Where(d => d.CodigoDane == codigoDane);
        if (excluirId is not null) query = query.Where(d => d.CodigoDane != excluirId);
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        Departamento entidad, CancellationToken ct)
    {
        var count = await Contexto.Municipios.CountAsync(m => m.CodigoDepartamento == entidad.CodigoDane, ct);
        return [ new DependenciaCatalogo("Municipios", "Municipios del departamento", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: MUNICIPIO (DIVIPOLA) — filtra por Departamento
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorMunicipio : CatalogoAdaptadorBase<Municipio>
{
    public AdaptadorMunicipio(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "municipios",
        "Municipios",
        "Municipios DIVIPOLA. Se filtran por departamento.",
        "nombre",
        [
            new CampoCatalogo("codigoDane",         "Código DANE",       TipoCampoCatalogo.Texto, Requerido: true),
            new CampoCatalogo("codigoDepartamento", "Código departamento", TipoCampoCatalogo.Texto, Requerido: true),
            new CampoCatalogo("nombre",             "Nombre",            TipoCampoCatalogo.Texto, Requerido: true),
            new CampoCatalogo("tipo",               "Tipo",              TipoCampoCatalogo.Texto, Requerido: false),
        ],
        Padre: new CatalogoPadreDefinicion(
            Tabla:          "departamentos",
            Etiqueta:       "Departamento",
            CampoPadre:     "codigoDepartamento",
            CampoClave:     "codigoDane",
            CampoEtiqueta:  "nombre"));

    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string? CampoFiltroPadre => "CodigoDepartamento";
    protected override string IdTexto(Municipio m) => m.CodigoDane;
    protected override Expression<Func<Municipio, bool>> PredicadoPorId(string id)
        => m => m.CodigoDane == id;

    protected override IReadOnlyDictionary<string, object?> EscribirValores(Municipio m)
        => new Dictionary<string, object?>
        {
            ["codigoDane"]         = m.CodigoDane,
            ["codigoDepartamento"] = m.CodigoDepartamento,
            ["nombre"]             = m.Nombre,
            ["tipo"]               = m.Tipo,
            ["activo"]             = m.Activo,
        };

    protected override Municipio CrearDesde(IDictionary<string, object?> valores)
        => new Municipio(
            CatalogoValores.Texto(valores, "codigoDane"),
            CatalogoValores.Texto(valores, "codigoDepartamento"),
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.Texto(valores, "tipo") is var t && !string.IsNullOrWhiteSpace(t) ? t : "Municipio");

    protected override void Sobreescribir(Municipio entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(
            CatalogoValores.Texto(valores, "codigoDepartamento"),
            CatalogoValores.Texto(valores, "nombre"),
            CatalogoValores.Texto(valores, "tipo") is var t && !string.IsNullOrWhiteSpace(t) ? t : entidad.Tipo);

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var codigoDane = CatalogoValores.Texto(valores, "codigoDane").Trim().PadLeft(5, '0');
        var query = Set.Where(m => m.CodigoDane == codigoDane);
        if (excluirId is not null) query = query.Where(m => m.CodigoDane != excluirId);
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        Municipio entidad, CancellationToken ct)
    {
        var count = await Contexto.Aseguradoras.CountAsync(a => a.CodigoMunicipio == entidad.CodigoDane, ct);
        return [ new DependenciaCatalogo("Aseguradoras", "Aseguradoras del municipio", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  ADAPTADOR :: ESTADO DE CITA (sin Activo)
// ══════════════════════════════════════════════════════════════
internal sealed class AdaptadorEstadoCita : CatalogoAdaptadorBase<EstadoCitaCatalogo>
{
    public AdaptadorEstadoCita(AgendaDbContext contexto) : base(contexto) { }

    public override CatalogoDefinicion Definicion => new(
        "estados-cita",
        "Estados de cita",
        "Estados del ciclo de vida de una cita (no admiten activación).",
        "nombre",
        [
            new CampoCatalogo("id",     "Id",     TipoCampoCatalogo.Numero, Requerido: true),
            new CampoCatalogo("nombre", "Nombre", TipoCampoCatalogo.Texto,  Requerido: true),
        ],
        PermiteActivos: false);

    protected override bool TieneActivo => false;
    protected override string CampoOrdenYBusqueda => "Nombre";
    protected override string IdTexto(EstadoCitaCatalogo e) => e.Id.ToString();
    protected override Expression<Func<EstadoCitaCatalogo, bool>> PredicadoPorId(string id)
        => e => e.Id == byte.Parse(id);

    protected override IReadOnlyDictionary<string, object?> EscribirValores(EstadoCitaCatalogo e)
        => new Dictionary<string, object?>
        {
            ["id"]     = e.Id,
            ["nombre"] = e.Nombre,
        };

    protected override EstadoCitaCatalogo CrearDesde(IDictionary<string, object?> valores)
        => new EstadoCitaCatalogo(
            (byte)CatalogoValores.Entero(valores, "id"),
            CatalogoValores.Texto(valores, "nombre"));

    protected override void Sobreescribir(EstadoCitaCatalogo entidad, IDictionary<string, object?> valores)
        => entidad.Actualizar(CatalogoValores.Texto(valores, "nombre"));

    protected override async Task<bool> ExisteDuplicadoAsync(
        IDictionary<string, object?> valores, string? excluirId, CancellationToken ct)
    {
        var nombre = NormalizacionTexto.Normalizar(CatalogoValores.Texto(valores, "nombre"));
        var query = Set.Where(e => EF.Functions.ILike(
            EF.Functions.Unaccent(e.Nombre), nombre));
        if (excluirId is not null) query = query.Where(e => e.Id != byte.Parse(excluirId));
        return await query.AnyAsync(ct);
    }

    protected override async Task<IReadOnlyList<DependenciaCatalogo>> ContarDependenciasAsync(
        EstadoCitaCatalogo entidad, CancellationToken ct)
    {
        var count = await Contexto.Citas.CountAsync(c => c.EstadoCitaId == entidad.Id, ct);
        return [ new DependenciaCatalogo("Citas", "Citas en este estado", count) ];
    }
}

// ══════════════════════════════════════════════════════════════
//  SERVICIO (dispatcher por nombre de tabla)
// ══════════════════════════════════════════════════════════════
public class CatalogoAdministracionServicio : IAdministracionCatalogos
{
    private readonly IReadOnlyDictionary<string, ICatalogoAdaptador> _adaptadores;

    public CatalogoAdministracionServicio(AgendaDbContext contexto)
    {
        ICatalogoAdaptador[] lista =
        [
            new AdaptadorEspecialidad(contexto),
            new AdaptadorTipoCita(contexto),
            new AdaptadorSede(contexto),
            new AdaptadorAseguradora(contexto),
            new AdaptadorTipoIdentificacion(contexto),
            new AdaptadorTipoEntidad(contexto),
            new AdaptadorTipoUsuario(contexto),
            new AdaptadorDepartamento(contexto),
            new AdaptadorMunicipio(contexto),
            new AdaptadorEstadoCita(contexto),
            new AdaptadorMotivoCancelacion(contexto),
        ];
        _adaptadores = lista.ToDictionary(a => a.Definicion.Tabla, StringComparer.OrdinalIgnoreCase);
    }

    private ICatalogoAdaptador Adaptador(string tabla)
        => _adaptadores.TryGetValue(tabla, out var adaptador)
           ? adaptador
           : throw new EntidadNoEncontradaException($"catálogo '{tabla}'");

    public async Task<IReadOnlyList<CatalogoDefinicion>> ObtenerDefinicionesAsync(CancellationToken ct = default)
    {
        var lista = new List<CatalogoDefinicion>(_adaptadores.Count);
        foreach (var a in _adaptadores.Values)
        {
            var (activos, inactivos) = await a.ContarAsync(ct);
            var d = a.Definicion;
            lista.Add(d with { ConteoActivos = activos, ConteoInactivos = inactivos });
        }
        return lista;
    }

    public Task<ResultadoCatalogo> ListarAsync(string tabla, string? termino, int pagina, int tamPagina,
        bool soloActivos, string? filtroPadre = null, CancellationToken ct = default)
        => Adaptador(tabla).ListarAsync(termino, filtroPadre, pagina, tamPagina, soloActivos, ct);

    public Task<CatalogoFila> ObtenerPorIdAsync(string tabla, string id, CancellationToken ct = default)
        => Adaptador(tabla).ObtenerPorIdAsync(id, ct);

    public Task<CatalogoFila> CrearAsync(string tabla, IReadOnlyDictionary<string, object?> valores,
        CancellationToken ct = default)
        => Adaptador(tabla).CrearAsync(new Dictionary<string, object?>(valores), ct);

    public Task<CatalogoFila> ActualizarAsync(string tabla, string id,
        IReadOnlyDictionary<string, object?> valores, CancellationToken ct = default)
        => Adaptador(tabla).ActualizarAsync(id, new Dictionary<string, object?>(valores), ct);

    public Task InactivarAsync(string tabla, string id, CancellationToken ct = default)
        => Adaptador(tabla).InactivarAsync(id, ct);

    public Task ActivarAsync(string tabla, string id, CancellationToken ct = default)
        => Adaptador(tabla).ActivarAsync(id, ct);

    public Task BorrarAsync(string tabla, string id, CancellationToken ct = default)
        => Adaptador(tabla).BorrarAsync(id, ct);

    public Task<IReadOnlyList<DependenciaCatalogo>> ObtenerDependenciasAsync(string tabla, string id,
        CancellationToken ct = default)
        => Adaptador(tabla).DependenciasAsync(id, ct);
}
