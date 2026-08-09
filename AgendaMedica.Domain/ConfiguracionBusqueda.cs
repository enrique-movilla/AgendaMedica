// ============================================================
//  AGENDA MÉDICA — CONFIGURACIÓN DE BÚSQUEDAS
//  Proyecto : AgendaMedica.Domain
//  Archivo  : ConfiguracionBusqueda.cs
// ============================================================
//  Define por campo el mínimo de caracteres para consultar la
//  base de datos, el máximo permitido y el tope de resultados.
//  El endpoint GET /v1/config/busqueda expone esta config y el
//  frontend puede sobreescribir (por pantalla/usuario) el mínimo
//  efectivo siempre que no baje del piso que exige el servidor.
// ============================================================

namespace AgendaMedica.Domain;

/// <summary>Criterios por campo usados en búsquedas (nombre, documento, etc.).</summary>
public sealed record ConfiguracionBusquedaCampo(
    string Campo,
    string Etiqueta,
    int    MinimoCaracteres,
    int    MaximoCaracteres,
    int    TopeResultados);

/// <summary>
/// Valores por defecto de la búsqueda. El backend siempre exige
/// <c>MinimoCaracteres</c> como piso antes de ir a la base de datos.
/// </summary>
public static class ConfiguracionBusqueda
{
    public const string NOMBRE      = "nombre";
    public const string DOCUMENTO   = "documento";
    public const string ASEGURADORA = "aseguradora";
    public const string MUNICIPIO   = "municipio";

    public static readonly IReadOnlyList<ConfiguracionBusquedaCampo> Campos =
    [
        new(NOMBRE,      "Nombre",               MinimoCaracteres: 3, MaximoCaracteres: 60, TopeResultados: 20),
        new(DOCUMENTO,   "Número de documento",  MinimoCaracteres: 0, MaximoCaracteres: 40, TopeResultados: 20),
        new(ASEGURADORA, "Aseguradora",          MinimoCaracteres: 4, MaximoCaracteres: 80, TopeResultados: 50),
        new(MUNICIPIO,   "Municipio",            MinimoCaracteres: 3, MaximoCaracteres: 80, TopeResultados: 20),
    ];

    public static ConfiguracionBusquedaCampo PorCampo(string campo)
        => Campos.FirstOrDefault(c => c.Campo == campo)
           ?? throw new ArgumentException($"Campo de búsqueda desconocido: {campo}");
}