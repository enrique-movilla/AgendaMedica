// ============================================================
//  AGENDA MÉDICA — ENTIDADES DE CATÁLOGO
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================
//  Estas entidades representan las tablas de catálogo de la BD.
//  Son simples, inmutables desde el dominio y se actualizan
//  solo por administración directa de la BD o un módulo de
//  configuración.
// ============================================================

namespace AgendaMedica.Domain.Entities;

// ── TipoIdentificacion ────────────────────────────────────────
/// <summary>
/// Catálogo de tipos de documento de identidad.
/// Ejemplos: CC, TI, CE, PA, RC, NIT.
/// </summary>
public class TipoIdentificacion
{
    public byte   Id     { get; private set; }
    public string Codigo { get; private set; } = string.Empty;  // "CC", "TI", etc.
    public string Nombre { get; private set; } = string.Empty;  // "Cédula de Ciudadanía"
    public bool   Activo { get; private set; } = true;

    // Constructor para EF Core (sin parámetros, acceso protegido)
    protected TipoIdentificacion() { }

    public TipoIdentificacion(byte id, string codigo, string nombre)
    {
        Id     = id;
        Codigo = codigo.Trim().ToUpper();
        Nombre = nombre.Trim();
    }

    /// <summary>Actualiza editable (el Id es la PK y no se modifica).</summary>
    public void Actualizar(string codigo, string nombre)
    {
        Codigo = codigo.Trim().ToUpper();
        Nombre = nombre.Trim();
    }

    // Navegación inversa: pacientes y profesionales con este tipo de doc
    public ICollection<Paciente>     Pacientes     { get; private set; } = new List<Paciente>();
    public ICollection<Profesional>  Profesionales { get; private set; } = new List<Profesional>();
}

// ── EstadoCita ────────────────────────────────────────────────
/// <summary>
/// Catálogo de estados del ciclo de vida de una cita.
/// El Id coincide con el enum EstadoCita del dominio.
/// </summary>
public class EstadoCitaCatalogo
{
    public byte   Id     { get; private set; }
    public string Nombre { get; private set; } = string.Empty;

    protected EstadoCitaCatalogo() { }

    public EstadoCitaCatalogo(byte id, string nombre)
    {
        Id     = id;
        Nombre = nombre.Trim();
    }

    /// <summary>Actualiza editable (el Id es la PK y no se modifica).</summary>
    public void Actualizar(string nombre)
    {
        Nombre = nombre.Trim();
    }
}

// ── Especialidad ─────────────────────────────────────────────
/// <summary>
/// Especialidad médica del profesional.
/// Ejemplos: Medicina General, Odontología, Psicología, Fisioterapia.
/// </summary>
public class Especialidad : EntidadBase, IActivable
{
    public string  Nombre      { get; private set; } = string.Empty;
    public string? Descripcion { get; private set; }
    public bool    Activo      { get; private set; } = true;

    // Navegación
    public ICollection<Profesional> Profesionales { get; private set; } = new List<Profesional>();

    protected Especialidad() { }

    public Especialidad(string nombre, string? descripcion = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre, nameof(nombre));
        Nombre      = nombre.Trim();
        Descripcion = descripcion?.Trim();
    }

    public void Actualizar(string nombre, string? descripcion)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre, nameof(nombre));
        Nombre      = nombre.Trim();
        Descripcion = descripcion?.Trim();
        MarcarModificado();
    }

    public void Inactivar() { Activo = false; MarcarModificado(); }
    public void Activar()   { Activo = true;  MarcarModificado(); }
}

// ── TipoCita ─────────────────────────────────────────────────
/// <summary>
/// Tipo de atención: consulta, examen de laboratorio,
/// procedimiento radiológico, odontológico, fisioterapia, etc.
/// La duración en minutos se usa para calcular la hora de fin.
/// </summary>
public class TipoCita : EntidadBase, IActivable
{
    public string           Nombre              { get; private set; } = string.Empty;
    public string           Categoria           { get; private set; } = string.Empty;  // CategoriaCita.ToString()
    public short            DuracionMinutos     { get; private set; } = 30;
    public bool             RequiereValidacion  { get; private set; } = false;
    public bool             Activo              { get; private set; } = true;

    // Navegación
    public ICollection<Cita> Citas { get; private set; } = new List<Cita>();

    protected TipoCita() { }

    public TipoCita(string nombre, string categoria, short duracionMinutos, bool requiereValidacion = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre, nameof(nombre));
        if (duracionMinutos < 5 || duracionMinutos > 480)
            throw new ArgumentOutOfRangeException(nameof(duracionMinutos),
                "La duración debe estar entre 5 y 480 minutos.");

        Nombre             = nombre.Trim();
        Categoria          = categoria.Trim();
        DuracionMinutos    = duracionMinutos;
        RequiereValidacion = requiereValidacion;
    }

    public void Actualizar(string nombre, string categoria, short duracionMinutos, bool requiereValidacion)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre, nameof(nombre));
        ArgumentException.ThrowIfNullOrWhiteSpace(categoria, nameof(categoria));
        if (duracionMinutos < 5 || duracionMinutos > 480)
            throw new ArgumentOutOfRangeException(nameof(duracionMinutos),
                "La duración debe estar entre 5 y 480 minutos.");

        Nombre             = nombre.Trim();
        Categoria          = categoria.Trim();
        DuracionMinutos    = duracionMinutos;
        RequiereValidacion = requiereValidacion;
        MarcarModificado();
    }

    public void Inactivar() { Activo = false; MarcarModificado(); }
    public void Activar()   { Activo = true;  MarcarModificado(); }
}

// ── Sede ──────────────────────────────────────────────────────
/// <summary>
/// Sede o punto de atención donde trabaja el profesional.
/// </summary>
public class Sede : EntidadBase
{
    public string  Nombre    { get; private set; } = string.Empty;
    public string? Direccion { get; private set; }
    public string? Ciudad    { get; private set; }
    public string? Telefono  { get; private set; }
    public bool    Activo    { get; private set; } = true;

    // Navegación
    public ICollection<Profesional> Profesionales { get; private set; } = new List<Profesional>();

    protected Sede() { }

    public Sede(string nombre, string? direccion = null, string? ciudad = null, string? telefono = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre, nameof(nombre));
        Nombre    = nombre.Trim();
        Direccion = direccion?.Trim();
        Ciudad    = ciudad?.Trim();
        Telefono  = telefono?.Trim();
    }

    public void Actualizar(string nombre, string? direccion, string? ciudad, string? telefono)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre, nameof(nombre));
        Nombre    = nombre.Trim();
        Direccion = direccion?.Trim();
        Ciudad    = ciudad?.Trim();
        Telefono  = telefono?.Trim();
        MarcarModificado();
    }

    public void Inactivar() { Activo = false; MarcarModificado(); }
}
