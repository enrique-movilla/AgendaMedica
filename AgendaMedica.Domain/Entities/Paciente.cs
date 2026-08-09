// ============================================================
//  AGENDA MÉDICA — ENTIDAD PACIENTE (v1.1 actualizado)
//  Proyecto : AgendaMedica.Domain / Entities / Paciente.cs
// ============================================================
//  Cambios v1.1:
//  - Agrega TipoUsuarioId (régimen: Contributivo, Subsidiado, etc.)
// ============================================================

using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

public class Paciente : EntidadBase
{
    // ── Identificación ────────────────────────────────────────
    public byte TipoIdentificacionId { get; private set; }
    public string NumeroIdentificacion { get; private set; } = string.Empty;

    // ── Datos personales ──────────────────────────────────────
    public string NombresCompletos { get; private set; } = string.Empty;
    public DateOnly FechaNacimiento { get; private set; }
    public char Sexo { get; private set; }

    // ── Contacto ──────────────────────────────────────────────
    public string? Celular { get; private set; }
    public string? Email { get; private set; }
    public string? Whatsapp { get; private set; }

    // ── Cobertura y empresa ───────────────────────────────────
    public int? AseguradoraId { get; private set; }
    public byte? TipoUsuarioId { get; private set; }   // ← NUEVO: régimen
    public string? Empresa { get; private set; }

    // ── Control ───────────────────────────────────────────────
    public bool Activo { get; private set; } = true;

    // ── Navegación ────────────────────────────────────────────
    public TipoIdentificacion? TipoIdentificacion { get; private set; }
    public Aseguradora? Aseguradora { get; private set; }
    public TipoUsuario? TipoUsuario { get; private set; }   // ← NUEVO
    public ICollection<Cita> Citas { get; private set; } = new List<Cita>();

    protected Paciente() { }

    public Paciente(
        byte tipoIdentificacionId,
        string numeroIdentificacion,
        string nombresCompletos,
        DateOnly fechaNacimiento,
        char sexo,
        string? celular = null,
        string? email = null,
        string? whatsapp = null,
        int? aseguradoraId = null,
        byte? tipoUsuarioId = null,
        string? empresa = null)
    {
        ValidarIdentificacion(tipoIdentificacionId, numeroIdentificacion);
        ValidarNombre(nombresCompletos);
        ValidarFechaNacimiento(fechaNacimiento);
        ValidarSexo(sexo);

        TipoIdentificacionId = tipoIdentificacionId;
        NumeroIdentificacion = numeroIdentificacion.Trim();
        NombresCompletos = nombresCompletos.Trim();
        FechaNacimiento = fechaNacimiento;
        Sexo = char.ToUpper(sexo);
        Celular = celular?.Trim();
        Email = email?.Trim().ToLower();
        Whatsapp = whatsapp?.Trim();
        AseguradoraId = aseguradoraId;
        TipoUsuarioId = tipoUsuarioId;
        Empresa = empresa?.Trim();
    }

    // ── Propiedades calculadas ────────────────────────────────
    public int EdadAnios
    {
        get
        {
            var hoy = DateOnly.FromDateTime(DateTime.Today);
            var edad = hoy.Year - FechaNacimiento.Year;
            if (FechaNacimiento.AddYears(edad) > hoy) edad--;
            return edad;
        }
    }

    public bool EsMenorDeEdad => EdadAnios < 18;

    // ── Métodos de dominio ────────────────────────────────────
    public void ActualizarContacto(string? celular, string? email, string? whatsapp)
    {
        Celular = celular?.Trim();
        Email = email?.Trim().ToLower();
        Whatsapp = whatsapp?.Trim();
        MarcarModificado();
    }

    public void ActualizarCobertura(int? aseguradoraId, byte? tipoUsuarioId, string? empresa)
    {
        AseguradoraId = aseguradoraId;
        TipoUsuarioId = tipoUsuarioId;
        Empresa = empresa?.Trim();
        MarcarModificado();
    }

    public void ActualizarNombre(string nombresCompletos)
    {
        ValidarNombre(nombresCompletos);
        NombresCompletos = nombresCompletos.Trim();
        MarcarModificado();
    }

    public void Inactivar() { Activo = false; MarcarModificado(); }

    // ── Validaciones privadas ─────────────────────────────────
    private static void ValidarIdentificacion(byte tipoId, string numero)
    {
        if (tipoId == 0)
            throw new DomainException("El tipo de identificación es requerido.");
        if (string.IsNullOrWhiteSpace(numero))
            throw new DomainException("El número de identificación es requerido.");
        if (numero.Trim().Length > 20)
            throw new DomainException("El número de identificación no puede superar 20 caracteres.");
    }

    private static void ValidarNombre(string nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre))
            throw new DomainException("El nombre completo del paciente es requerido.");
        if (nombre.Trim().Length > 200)
            throw new DomainException("El nombre no puede superar 200 caracteres.");
    }

    private static void ValidarFechaNacimiento(DateOnly fecha)
    {
        if (fecha >= DateOnly.FromDateTime(DateTime.Today))
            throw new DomainException("La fecha de nacimiento debe ser anterior a hoy.");
        if (fecha.Year < 1900)
            throw new DomainException("La fecha de nacimiento no es válida.");
    }

    private static void ValidarSexo(char sexo)
    {
        if (char.ToUpper(sexo) != 'M' && char.ToUpper(sexo) != 'F')
            throw new DomainException("El sexo debe ser 'M' (Masculino) o 'F' (Femenino).");
    }
}
