// ============================================================
//  AGENDA MÉDICA — ADMINISTRACIÓN DE CATÁLOGOS (Fase 1)
//  Proyecto : AgendaMedica.Domain
//  Archivo  : AdministracionCatalogos.cs
// ============================================================
//  Define el contrato genérico para administrar los catálogos
//  del sistema (crear, leer, actualizar, inactivar, activar,
//  borrar y consultar dependencias).
//
//  El adaptador debe ser agnóstico del catálogo concreto: la
//  información de cada catálogo (tabla, campos, etc.) la entrega
//  CatalogoDefinicion y los valores se intercambian como
//  diccionarios genéricos. Los adaptadores específicos viven en
//  Infrastructure/Administracion.
// ============================================================

namespace AgendaMedica.Domain;

/// <summary>Tipo de dato que acepta un campo de catálogo.</summary>
[System.Text.Json.Serialization.JsonConverter(
    typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
public enum TipoCampoCatalogo
{
    /// <summary>Cadena de texto libre.</summary>
    Texto,

    /// <summary>Número entero.</summary>
    Numero,

    /// <summary>Valor lógico (activar / desactivar).</summary>
    Logico,
}

/// <summary>
/// Descripción de un campo de un catálogo: cómo se llama, cómo se
/// muestra al usuario y qué tipo de dato representa.
/// </summary>
public sealed record CampoCatalogo(
    string              Campo,
    string              Etiqueta,
    TipoCampoCatalogo   Tipo,
    bool                Requerido);

/// <summary>
/// Descripción de un filtro por catálogo padre. P. ej. Municipio se
/// filtra por Departamento (campo codigoDepartamento).
/// </summary>
public sealed record CatalogoPadreDefinicion(
    string Tabla,          // ruta del padre, ej. "departamentos"
    string Etiqueta,       // "Departamento"
    string CampoPadre,     // campo del hijo que iguala al padre, ej. "codigoDepartamento"
    string CampoClave,     // campo del padre que identifica la opción, ej. "codigoDane"
    string CampoEtiqueta); // campo del padre a mostrar, ej. "nombre"

/// <summary>
/// Definición de un catálogo administrable y sus campos visibles.
/// El frontend usa esta metadata para dibujar el formulario y la
/// tabla de manera dinámica, sin saber nada de la entidad C#.
/// </summary>
public sealed record CatalogoDefinicion(
    string                       Tabla,             // ruta /"especialidades"
    string                       Etiqueta,          // "Especialidades"
    string                       Descripcion,
    string                       CampoPrincipal,    // campo a listar/identificar la fila
    IReadOnlyList<CampoCatalogo> Campos,
    bool                         PermiteActivos = true,
    int                          ConteoActivos   = 0,
    int                          ConteoInactivos = 0,
    CatalogoPadreDefinicion?     Padre           = null);

/// <summary>
/// Fila concreta de un catálogo. Los valores vienen como diccionario
/// genérico (campo → valor) para no acoplar la API a una entidad C#.
/// El Id es string para admitir PK numéricas y de texto (ej. CodigoDane).
/// </summary>
public sealed record CatalogoFila(string Id, IReadOnlyDictionary<string, object?> Valores);

/// <summary>Resultado paginado de una consulta de catálogo.</summary>
public sealed record ResultadoCatalogo(
    IReadOnlyList<CatalogoFila> Items,
    int                         Total,
    int                         Pagina,
    int                         TamPagina,
    int                         TotalPaginas);

/// <summary>
/// Dependencia de una fila de catálogo hacia otra entidad.
/// Impide el borrado físico cuando hay referencias activas.
/// </summary>
public sealed record DependenciaCatalogo(
    string Entidad,     // "Profesionales"
    string Descripcion, // "Profesionales asignados"
    int    Conteo);

/// <summary>
/// Contrato de administración de catálogos. Implementación en
/// Infrastructure/Administracion/CatalogoAdministracionServicio.cs.
/// </summary>
public interface IAdministracionCatalogos
{
    /// <summary>Lista las definiciones de todos los catálogos administrables.</summary>
    Task<IReadOnlyList<CatalogoDefinicion>> ObtenerDefinicionesAsync(CancellationToken ct = default);

    /// <summary>Consulta paginada de un catálogo, con búsqueda opcional.</summary>
    Task<ResultadoCatalogo> ListarAsync(
        string tabla, string? termino, int pagina, int tamPagina, bool soloActivos,
        string? filtroPadre = null, CancellationToken ct = default);

    /// <summary>Obtiene una fila por su Id.</summary>
    Task<CatalogoFila> ObtenerPorIdAsync(string tabla, string id, CancellationToken ct = default);

    /// <summary>Crea una fila en el catálogo.</summary>
    Task<CatalogoFila> CrearAsync(
        string tabla, IReadOnlyDictionary<string, object?> valores, CancellationToken ct = default);

    /// <summary>Actualiza una fila existente.</summary>
    Task<CatalogoFila> ActualizarAsync(
        string tabla, string id, IReadOnlyDictionary<string, object?> valores,
        CancellationToken ct = default);

    /// <summary>Inactiva (soft delete) una fila.</summary>
    Task InactivarAsync(string tabla, string id, CancellationToken ct = default);

    /// <summary>Re-activa una fila previamente inactivada.</summary>
    Task ActivarAsync(string tabla, string id, CancellationToken ct = default);

    /// <summary>Borra físicamente una fila (validando dependencias).</summary>
    Task BorrarAsync(string tabla, string id, CancellationToken ct = default);

    /// <summary>Devuelve las dependencias que impiden el borrado de una fila.</summary>
    Task<IReadOnlyList<DependenciaCatalogo>> ObtenerDependenciasAsync(
        string tabla, string id, CancellationToken ct = default);
}