// ============================================================
//  AGENDA MÉDICA — ENDPOINT DE CONFIGURACIÓN DE BÚSQUEDAS
//  Proyecto : AgendaMedica.Api / Controllers
//  Archivo  : ConfiguracionController.cs
// ============================================================
//  Expone la configuración de búsquedas de ConfiguracionBusqueda
//  para que el frontend la consuma y la use para regular los
//  mínimo exigidos por campo.
// ============================================================

using AgendaMedica.Domain;
using Microsoft.AspNetCore.Mvc;

namespace AgendaMedica.Api.Controllers;

[ApiController]
[Route("v1/config")]
[Produces("application/json")]
public class ConfiguracionController : ControllerBase
{
    /// <summary>
    /// Devuelve la configuración (mínimos, máximos y topes) de cada
    /// campo de búsqueda. El frontend la usa como contrato.
    /// </summary>
    [HttpGet("busqueda")]
    [ProducesResponseType(typeof(List<ConfiguracionBusquedaCampo>), StatusCodes.Status200OK)]
    public IActionResult Busqueda()
        => Ok(ConfiguracionBusqueda.Campos.ToList());
}