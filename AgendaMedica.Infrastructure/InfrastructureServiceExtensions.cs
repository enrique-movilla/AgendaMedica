// ============================================================
//  AGENDA MÉDICA — INFRASTRUCTURE SERVICE EXTENSIONS (v1.3)
//  Proyecto : AgendaMedica.Infrastructure
//  Archivo  : InfrastructureServiceExtensions.cs
// ============================================================
//  Versión 1.3: agrega registro de:
//  - IMicrosoftGraphService (integración Teams)
//  - INotificacionService   (email, WhatsApp, SMS)
//  - OutboxProcessor        (job de sincronización Teams)
//  - RecordatorioProcessor  (job de recordatorios 24h)
// ============================================================

using AgendaMedica.Domain;
using AgendaMedica.Domain.Interfaces;
using AgendaMedica.Infrastructure.Administracion;
using AgendaMedica.Infrastructure.Data;
using AgendaMedica.Infrastructure.Integrations;
using AgendaMedica.Infrastructure.Jobs;
using AgendaMedica.Infrastructure.Notifications;
using AgendaMedica.Infrastructure.Repositories;
using AgendaMedica.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgendaMedica.Infrastructure;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration          configuration)
    {
        // ── DbContext ─────────────────────────────────────────
        //        services.AddDbContext<AgendaDbContext>(options =>
        //        {
        //            options.UseSqlServer(
        //                configuration.GetConnectionString("AgendaMedica"),
        //                sql =>
        //                {
        //                    sql.MigrationsAssembly(
        //                        typeof(AgendaDbContext).Assembly.FullName);
        //                    sql.EnableRetryOnFailure(
        //                        3, TimeSpan.FromSeconds(10), null);
        //                });
        //#if DEBUG
        //            options.LogTo(Console.WriteLine,
        //                Microsoft.Extensions.Logging.LogLevel.Information);
        //            options.EnableSensitiveDataLogging();
        //#endif
        //        });
        // ── DbContext (Configurado para Supabase - PostgreSQL) ──
        services.AddDbContext<AgendaDbContext>(options =>
        {
            options.UseNpgsql(
                configuration.GetConnectionString("SupabaseConnection"),
                npgsql =>
                {
                    npgsql.MigrationsAssembly(
                        typeof(AgendaDbContext).Assembly.FullName);
                    npgsql.EnableRetryOnFailure(
                        3, TimeSpan.FromSeconds(10), null);
                });
#if DEBUG
            options.LogTo(Console.WriteLine,
                Microsoft.Extensions.Logging.LogLevel.Information);
            options.EnableSensitiveDataLogging();
#endif
        });


        // ── UnitOfWork ────────────────────────────────────────
        services.AddScoped<IUnitOfWork, UnitOfWork>();

// ── Repositorios principales ──────────────────────────
        services.AddScoped<ICitaRepositorio,         CitaRepositorio>();
        services.AddScoped<IPacienteRepositorio,     PacienteRepositorio>();
        services.AddScoped<IProfesionalRepositorio,  ProfesionalRepositorio>();

        // ── Plantillas de disponibilidad ──────────────────────
        services.AddScoped<IDisponibilidadRepositorio,
                           DisponibilidadProfesionalRepositorio>();

        // ── Catálogos propios ─────────────────────────────────
        services.AddScoped<IAseguradoraRepositorio,  AseguradoraRepositorio>();
        services.AddScoped<IEspecialidadRepositorio, EspecialidadRepositorio>();
        services.AddScoped<ISedeRepositorio,         SedeRepositorio>();
        services.AddScoped<ITipoCitaRepositorio,     TipoCitaRepositorio>();

        // ── Catálogos compartidos ─────────────────────────────
        services.AddScoped<IDepartamentoRepositorio, DepartamentoRepositorio>();
        services.AddScoped<IMunicipioRepositorio,    MunicipioRepositorio>();
        services.AddScoped<ITipoEntidadRepositorio,  TipoEntidadRepositorio>();
        services.AddScoped<ITipoUsuarioRepositorio,  TipoUsuarioRepositorio>();
        services.AddScoped<ITipoIdentificacionRepositorio,
                           TipoIdentificacionRepositorio>();

        // ── Integración Microsoft Teams ───────────────────────
        // Singleton: la instancia de GraphServiceClient es thread-safe
        // y costosa de crear — se reutiliza durante toda la aplicación
        services.AddSingleton<IMicrosoftGraphService, MicrosoftGraphService>();

// ── Servicio de notificaciones ────────────────────────
        // Scoped: necesita acceso a DbContext (que es Scoped)
        services.AddScoped<INotificacionService, NotificacionService>();

        // ── Bloqueo preventivo de turnos (Fase 3) ───────────────
        // Singleton + MemoryCache: bloqueos en memoria con TTL de 5 min
        services.AddMemoryCache();
        services.AddSingleton<IBloqueoTurnoServicio, BloqueoTurnoServicio>();

        // ── Administración de catálogos (patrón adaptador) ─────
        services.AddScoped<IAdministracionCatalogos, CatalogoAdministracionServicio>();

        // ── Jobs en segundo plano ─────────────────────────────
        // OutboxProcessor: sincroniza citas con Teams cada 15 segundos
        services.AddHostedService<OutboxProcessor>();

        // RecordatorioProcessor: envía recordatorios cada hora
        services.AddHostedService<RecordatorioProcessor>();

        return services;
    }
}
