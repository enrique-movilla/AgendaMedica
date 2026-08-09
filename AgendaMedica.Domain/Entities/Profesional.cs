// ============================================================
//  AGENDA MÉDICA — ENTIDAD PROFESIONAL
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================

using AgendaMedica.Domain.Exceptions;

namespace AgendaMedica.Domain.Entities;

/// <summary>
/// Representa al profesional de salud que atiende la cita.
/// Puede ser médico, odontólogo, psicólogo, fisioterapeuta,
/// fonoaudiólogo, radiólogo, enfermero, etc.
/// </summary>
public class Profesional : EntidadBase
{
    // ── Identificación ────────────────────────────────────────
    public byte   TipoIdentificacionId  { get; private set; }
    public string NumeroIdentificacion  { get; private set; } = string.Empty;

    // ── Datos personales ──────────────────────────────────────
    public string  NombresCompletos { get; private set; } = string.Empty;

    // ── Contacto ──────────────────────────────────────────────
    public string? Celular { get; private set; }
    public string? Email   { get; private set; }

    // ── Ubicación y especialidad ──────────────────────────────
    public int     EspecialidadId   { get; private set; }
    public int     SedeId           { get; private set; }
    public string? ConsultorioSala  { get; private set; }
    public string? RegistroMedico   { get; private set; }   // Número de tarjeta profesional

    // ── Control ───────────────────────────────────────────────
    public bool Activo { get; private set; } = true;

    // ── Navegación ────────────────────────────────────────────
    public TipoIdentificacion?  TipoIdentificacion { get; private set; }
    public Especialidad?        Especialidad       { get; private set; }
    public Sede?                Sede               { get; private set; }
    public ICollection<Cita>    Citas              { get; private set; } = new List<Cita>();

    // ── Constructor protegido para EF Core ────────────────────
    protected Profesional() { }

    // ── Constructor de dominio ────────────────────────────────
    public Profesional(
        byte    tipoIdentificacionId,
        string  numeroIdentificacion,
        string  nombresCompletos,
        int     especialidadId,
        int     sedeId,
        string? celular          = null,
        string? email            = null,
        string? consultorioSala  = null,
        string? registroMedico   = null)
    {
        ValidarIdentificacion(tipoIdentificacionId, numeroIdentificacion);
        ValidarNombre(nombresCompletos);

        if (especialidadId <= 0)
            throw new DomainException("La especialidad es requerida.");
        if (sedeId <= 0)
            throw new DomainException("La sede es requerida.");

        TipoIdentificacionId = tipoIdentificacionId;
        NumeroIdentificacion = numeroIdentificacion.Trim();
        NombresCompletos     = nombresCompletos.Trim();
        EspecialidadId       = especialidadId;
        SedeId               = sedeId;
        Celular              = celular?.Trim();
        Email                = email?.Trim().ToLower();
        ConsultorioSala      = consultorioSala?.Trim();
        RegistroMedico       = registroMedico?.Trim();
    }

    // ── Métodos de dominio ────────────────────────────────────

    /// <summary>
    /// Actualiza los datos de contacto y ubicación del profesional.
    /// </summary>
    public void ActualizarDatos(
        string  nombresCompletos,
        int     especialidadId,
        int     sedeId,
        string? celular,
        string? email,
        string? consultorioSala,
        string? registroMedico)
    {
        ValidarNombre(nombresCompletos);
        if (especialidadId <= 0)
            throw new DomainException("La especialidad es requerida.");
        if (sedeId <= 0)
            throw new DomainException("La sede es requerida.");

        NombresCompletos = nombresCompletos.Trim();
        EspecialidadId   = especialidadId;
        SedeId           = sedeId;
        Celular          = celular?.Trim();
        Email            = email?.Trim().ToLower();
        ConsultorioSala  = consultorioSala?.Trim();
        RegistroMedico   = registroMedico?.Trim();
        MarcarModificado();
    }

    /// <summary>
    /// Baja lógica: el profesional no se elimina físicamente.
    /// </summary>
    public void Inactivar()
    {
        Activo = false;
        MarcarModificado();
    }

    public void Activar()
    {
        Activo = true;
        MarcarModificado();
    }

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
            throw new DomainException("El nombre completo del profesional es requerido.");
        if (nombre.Trim().Length > 200)
            throw new DomainException("El nombre no puede superar 200 caracteres.");
    }
}
