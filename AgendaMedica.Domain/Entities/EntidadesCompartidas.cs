// ============================================================
//  AGENDA MÉDICA — ENTIDADES COMPARTIDAS (v1.2 — fix FK)
//  Proyecto : AgendaMedica.Domain / Entities
//  Archivo  : EntidadesCompartidas.cs
// ============================================================
//  Corrección v1.2:
//  Se eliminaron las colecciones de navegación INVERSAS en
//  Departamento y Municipio (ICollection<Aseguradora>, etc.)
//  porque EF Core generaba la columna fantasma
//  'DepartamentoCodigoDane' al intentar resolver esas
//  relaciones inversas con PKs de tipo string.
//  Las relaciones ahora son UNIDIRECCIONALES:
//    Aseguradora → Municipio   (solo desde Aseguradora)
//    Municipio   → Departamento (solo desde Municipio)
// ============================================================

namespace AgendaMedica.Domain.Entities;

// ── Departamento (DIVIPOLA) ───────────────────────────────────
public class Departamento
{
    public string CodigoDane { get; private set; } = string.Empty;
    public string Nombre     { get; private set; } = string.Empty;
    public bool   Activo     { get; private set; } = true;

    // ← SIN ICollection<Municipio> ni ICollection<Aseguradora>
    // Las colecciones inversas causaban el error DepartamentoCodigoDane

    protected Departamento() { }

    public Departamento(string codigoDane, string nombre)
    {
        CodigoDane = codigoDane.Trim().PadLeft(2, '0');
        Nombre     = nombre.Trim().ToUpper();
    }

    /// <summary>Actualiza editable (el CodigoDane es la PK y no se modifica).</summary>
    public void Actualizar(string nombre)
    {
        Nombre = nombre.Trim().ToUpper();
    }
}

// ── Municipio (DIVIPOLA) ──────────────────────────────────────
public class Municipio
{
    public string   CodigoDane         { get; private set; } = string.Empty;
    public string   CodigoDepartamento { get; private set; } = string.Empty;
    public string   Nombre             { get; private set; } = string.Empty;
    public string   Tipo               { get; private set; } = "Municipio";
    public decimal? Longitud           { get; private set; }
    public decimal? Latitud            { get; private set; }
    public bool     Activo             { get; private set; } = true;

    // Navegación: solo hacia el padre (unidireccional)
    public Departamento? Departamento  { get; private set; }

    // ← SIN ICollection<Aseguradora>
    // Causaba que EF buscara DepartamentoCodigoDane

    protected Municipio() { }

    public Municipio(string codigoDane, string codigoDepartamento,
                     string nombre, string tipo = "Municipio",
                     decimal? longitud = null, decimal? latitud = null)
    {
        CodigoDane         = codigoDane.Trim().PadLeft(5, '0');
        CodigoDepartamento = codigoDepartamento.Trim().PadLeft(2, '0');
        Nombre             = nombre.Trim().ToUpper();
        Tipo               = tipo;
        Longitud           = longitud;
        Latitud            = latitud;
    }

    /// <summary>Actualiza editable (el CodigoDane es la PK y no se modifica).</summary>
    public void Actualizar(string codigoDepartamento, string nombre, string tipo)
    {
        CodigoDepartamento = codigoDepartamento.Trim().PadLeft(2, '0');
        Nombre             = nombre.Trim().ToUpper();
        Tipo               = tipo;
    }

    public string CodigoDepartamentoCalculado
        => CodigoDane.Length >= 2 ? CodigoDane[..2] : CodigoDepartamento;
}

// ── TipoEntidad ───────────────────────────────────────────────
public class TipoEntidad
{
    public byte    Id          { get; private set; }
    public string  Codigo      { get; private set; } = string.Empty;
    public string  Nombre      { get; private set; } = string.Empty;
    public string? OtroNombre  { get; private set; }
    public bool    Activo      { get; private set; } = true;

    // ← SIN ICollection<Aseguradora>

    protected TipoEntidad() { }

    public TipoEntidad(byte id, string codigo, string nombre, string? otroNombre = null)
    {
        Id         = id;
        Codigo     = codigo.Trim().ToUpper();
        Nombre     = nombre.Trim();
        OtroNombre = otroNombre?.Trim();
    }

    /// <summary>Actualiza editable (el Id es la PK y no se modifica).</summary>
    public void Actualizar(string codigo, string nombre, string? otroNombre)
    {
        Codigo     = codigo.Trim().ToUpper();
        Nombre     = nombre.Trim();
        OtroNombre = otroNombre?.Trim();
    }
}

// ── TipoUsuario ───────────────────────────────────────────────
public class TipoUsuario
{
    public byte   Id     { get; private set; }
    public string Codigo { get; private set; } = string.Empty;
    public string Nombre { get; private set; } = string.Empty;
    public bool   Activo { get; private set; } = true;

    // Navegación inversa mantenida — estas FKs son int, no causan problema
    public ICollection<Paciente> Pacientes { get; private set; } = new List<Paciente>();
    public ICollection<Cita>     Citas     { get; private set; } = new List<Cita>();

    protected TipoUsuario() { }

    public TipoUsuario(byte id, string codigo, string nombre)
    {
        Id     = id;
        Codigo = codigo.Trim();
        Nombre = nombre.Trim();
    }

    /// <summary>Actualiza editable (el Id es la PK y no se modifica).</summary>
    public void Actualizar(string codigo, string nombre)
    {
        Codigo = codigo.Trim();
        Nombre = nombre.Trim();
    }
}

// ── Aseguradora ───────────────────────────────────────────────
public class Aseguradora : EntidadBase
{
    public byte    TipoEntidadId    { get; private set; }
    public string  Codigo           { get; private set; } = string.Empty;
    public string  Sigla            { get; private set; } = string.Empty;
    public string  Nombre           { get; private set; } = string.Empty;
    public string? Gerente          { get; private set; }
    public string? CodigoMunicipio  { get; private set; }
    public string? Direccion        { get; private set; }
    public string? Telefono         { get; private set; }
    public string? Email            { get; private set; }
    public string? Url              { get; private set; }
    public string? UrlRed           { get; private set; }
    public bool    Activo           { get; private set; } = true;

    // Navegación: solo hacia sus padres (unidireccional)
    public TipoEntidad? TipoEntidad { get; private set; }
    public Municipio?   Municipio   { get; private set; }

    // Navegación inversa mantenida — FK es int, no causa problema
    public ICollection<Paciente> Pacientes { get; private set; } = new List<Paciente>();
    public ICollection<Cita>     Citas     { get; private set; } = new List<Cita>();

    protected Aseguradora() { }

    public Aseguradora(
        byte    tipoEntidadId,
        string  codigo,
        string  sigla,
        string  nombre,
        string? gerente         = null,
        string? codigoMunicipio = null,
        string? direccion       = null,
        string? telefono        = null,
        string? email           = null,
        string? url             = null,
        string? urlRed          = null)
    {
        if (string.IsNullOrWhiteSpace(codigo))
            throw new Domain.Exceptions.DomainException("El código de la aseguradora es requerido.");
        if (string.IsNullOrWhiteSpace(nombre))
            throw new Domain.Exceptions.DomainException("El nombre de la aseguradora es requerido.");

        TipoEntidadId   = tipoEntidadId;
        Codigo          = codigo.Trim().ToUpper();
        Sigla           = sigla.Trim();
        Nombre          = nombre.Trim();
        Gerente         = gerente?.Trim();
        CodigoMunicipio = codigoMunicipio?.Trim();
        Direccion       = direccion?.Trim();
        Telefono        = telefono?.Trim();
        Email           = email?.Trim().ToLower();
        Url             = url?.Trim();
        UrlRed          = urlRed?.Trim();
    }

    public void Actualizar(string sigla, string nombre, string? gerente,
                           string? codigoMunicipio, string? direccion,
                           string? telefono, string? email,
                           string? url, string? urlRed)
    {
        Sigla           = sigla.Trim();
        Nombre          = nombre.Trim();
        Gerente         = gerente?.Trim();
        CodigoMunicipio = codigoMunicipio?.Trim();
        Direccion       = direccion?.Trim();
        Telefono        = telefono?.Trim();
        Email           = email?.Trim().ToLower();
        Url             = url?.Trim();
        UrlRed          = urlRed?.Trim();
        MarcarModificado();
    }

    public void Inactivar() { Activo = false; MarcarModificado(); }
    public void Activar()   { Activo = true;  MarcarModificado(); }
}
