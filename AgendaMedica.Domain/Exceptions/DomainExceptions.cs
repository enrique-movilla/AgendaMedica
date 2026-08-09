// ============================================================
//  AGENDA MÉDICA — EXCEPCIONES DEL DOMINIO
//  Proyecto : AgendaMedica.Domain / Exceptions
// ============================================================

namespace AgendaMedica.Domain.Exceptions;

/// <summary>
/// Excepción base para violaciones de reglas de negocio del dominio.
/// La capa de API la captura y devuelve HTTP 422 (Unprocessable Entity).
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
    public DomainException(string message, Exception inner) : base(message, inner) { }
}

/// <summary>
/// Se lanza cuando una entidad no existe en la base de datos.
/// La capa de API la captura y devuelve HTTP 404 (Not Found).
/// </summary>
public class EntidadNoEncontradaException : DomainException
{
    public EntidadNoEncontradaException(string entidad, int id)
        : base($"{entidad} con Id {id} no fue encontrada.") { }

    public EntidadNoEncontradaException(string entidad, string id)
        : base($"{entidad} con Id {id} no fue encontrada.") { }

    public EntidadNoEncontradaException(string mensaje)
        : base(mensaje) { }
}

/// <summary>
/// Se lanza cuando hay un conflicto de horario al programar una cita.
/// La capa de API la captura y devuelve HTTP 409 (Conflict).
/// </summary>
public class ConflictoHorarioException : DomainException
{
    public ConflictoHorarioException(DateTime fechaHora, DateTime fechaHoraFin)
        : base($"El profesional ya tiene una cita entre las " +
               $"{fechaHora:HH:mm} y las {fechaHoraFin:HH:mm} del {fechaHora:dd/MM/yyyy}.")
    { }
}

/// <summary>
/// Se lanza cuando se intenta registrar una entidad duplicada.
/// La capa de API la captura y devuelve HTTP 409 (Conflict).
/// </summary>
public class EntidadDuplicadaException : DomainException
{
    public EntidadDuplicadaException(string entidad, string criterio)
        : base($"Ya existe un {entidad} con {criterio}.") { }
}
