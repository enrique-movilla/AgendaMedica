// ============================================================
//  AGENDA MÉDICA — BEHAVIOR DE EXCEPCIONES Y REGISTRO
//  Proyecto : AgendaMedica.Application
//  Archivo  : ApplicationServiceExtensions.cs
// ============================================================

using AgendaMedica.Domain.Exceptions;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Reflection;

namespace AgendaMedica.Application;

// ── Behavior de excepciones ───────────────────────────────────
/// <summary>
/// Se ejecuta antes y después de cada Command o Query.
/// Captura excepciones del dominio y las registra en el log.
/// </summary>
public class ExceptionBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<ExceptionBehavior<TRequest, TResponse>> _logger;

    public ExceptionBehavior(
        ILogger<ExceptionBehavior<TRequest, TResponse>> logger)
        => _logger = logger;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        var nombreOperacion = typeof(TRequest).Name;

        try
        {
            _logger.LogInformation("Ejecutando: {Operacion}", nombreOperacion);
            var resultado = await next();
            _logger.LogInformation("Completado: {Operacion}", nombreOperacion);
            return resultado;
        }
        catch (EntidadNoEncontradaException ex)
        {
            _logger.LogWarning("No encontrado en {Op}: {Msg}", nombreOperacion, ex.Message);
            throw;
        }
        catch (ConflictoHorarioException ex)
        {
            _logger.LogWarning("Conflicto de horario en {Op}: {Msg}", nombreOperacion, ex.Message);
            throw;
        }
        catch (EntidadDuplicadaException ex)
        {
            _logger.LogWarning("Duplicado en {Op}: {Msg}", nombreOperacion, ex.Message);
            throw;
        }
        catch (DomainException ex)
        {
            _logger.LogWarning("Regla de dominio en {Op}: {Msg}", nombreOperacion, ex.Message);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inesperado en {Op}", nombreOperacion);
            throw;
        }
    }
}

// ── Registro de servicios ─────────────────────────────────────
/// <summary>
/// Se llama una vez desde Program.cs del proyecto Api:
///     builder.Services.AddApplication();
/// </summary>
public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
            cfg.AddBehavior(typeof(IPipelineBehavior<,>),
                            typeof(ExceptionBehavior<,>));
        });

        return services;
    }
}