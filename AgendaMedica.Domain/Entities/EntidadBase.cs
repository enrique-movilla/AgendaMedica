// ============================================================
//  AGENDA MÉDICA — CLASE BASE DE ENTIDAD
//  Proyecto : AgendaMedica.Domain / Entities
// ============================================================
//  Todas las entidades del dominio heredan de esta clase.
//  Provee el Id y los campos de auditoría comunes.
// ============================================================

namespace AgendaMedica.Domain.Entities;

public abstract class EntidadBase
{
    public int Id { get; protected set; }

    // Auditoría de creación
    public DateTime FechaCreacion    { get; protected set; } = DateTime.UtcNow;

    // Auditoría de última modificación
    public DateTime? FechaModificacion { get; protected set; }

    // Igualdad por identidad (Id), no por referencia
    public override bool Equals(object? obj)
    {
        if (obj is not EntidadBase other) return false;
        if (ReferenceEquals(this, other)) return true;
        if (GetType() != other.GetType()) return false;
        return Id != 0 && Id == other.Id;
    }

    public override int GetHashCode() => Id.GetHashCode();

    protected void MarcarModificado()
        => FechaModificacion = DateTime.UtcNow;
}

/// <summary>
/// Entidades que admiten inactivación lógica (soft delete).
/// La administración de catálogos la usa para activar/desactivar filas.
/// </summary>
public interface IActivable
{
    bool Activo { get; }
    void Inactivar();
    void Activar();
}
