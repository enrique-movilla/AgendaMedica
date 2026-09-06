// ============================================================
//  AGENDA MÉDICA — DbContext ACTUALIZADO (v1.1)
//  Proyecto : AgendaMedica.Infrastructure / Data / AgendaDbContext.cs
// ============================================================
//  Cambios v1.1:
//  - Agrega DbSets para Departamento, Municipio, TipoEntidad, TipoUsuario
//  - Aseguradora rediseñada con nueva estructura
// ============================================================

using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Reflection;

namespace AgendaMedica.Infrastructure.Data;

public class AgendaDbContext : DbContext
{
    public AgendaDbContext(DbContextOptions<AgendaDbContext> options)
        : base(options) { }

    // ── Tablas principales ────────────────────────────────────
    public DbSet<Cita>                 Citas                { get; set; }
    public DbSet<Paciente>             Pacientes            { get; set; }
    public DbSet<Profesional>          Profesionales        { get; set; }

    // ── Plantillas de disponibilidad ─────────────────────────
    public DbSet<DisponibilidadProfesional> Disponibilidades { get; set; }

    // ── Bloqueos de agenda y excepciones horarias ────────────
    public DbSet<BloqueoAgenda>  BloqueosAgenda   { get; set; }
    public DbSet<ExcepcionHoraria> ExcepcionesHorarias { get; set; }

    // ── Catálogos propios ─────────────────────────────────────
    public DbSet<TipoIdentificacion>   TiposIdentificacion  { get; set; }
    public DbSet<Especialidad>         Especialidades       { get; set; }
    public DbSet<TipoCita>             TiposCita            { get; set; }
    public DbSet<Sede>                 Sedes                { get; set; }
    public DbSet<EstadoCitaCatalogo>   EstadosCita          { get; set; }
    public DbSet<MotivoCancelacion>    MotivosCancelacion   { get; set; }
    public DbSet<CatalogoTermino>      CatalogoTerminos     { get; set; }

    // ── Catálogos compartidos (también usados por HC y Facturación)
    public DbSet<Departamento>         Departamentos        { get; set; }
    public DbSet<Municipio>            Municipios           { get; set; }
    public DbSet<TipoEntidad>          TiposEntidad         { get; set; }
    public DbSet<TipoUsuario>          TiposUsuario         { get; set; }
    public DbSet<Aseguradora>          Aseguradoras         { get; set; }

    // ── Tablas de soporte ─────────────────────────────────────
    public DbSet<HistorialEstadoCita>  HistorialEstadosCita { get; set; }
    public DbSet<OutboxMensaje>        OutboxMensajes       { get; set; }
    public DbSet<NotificacionLog>      NotificacionesLog    { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified))
        {
            if (entry.Entity is EntidadBase)
                entry.Property("FechaModificacion").CurrentValue = DateTime.UtcNow;
        }
        try
        {
            return await base.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (EsViolacionExclusionTraslape(ex))
        {
            // La BD rechazó el INSERT/UPDATE por el constraint EXCLUDE
            // EX_Cita_Profesional_SinTraslape (Fase 4, ítem 15). Ocurre solo
            // en condición de carrera: dos usuarios pasaron el check previo
            // ExisteTraslapeAsync y guardaron el mismo slot a la vez.
            // Se traduce a ConflictoHorarioException para que la API
            // devuelva el 409 HORARIO_OCUPADO que el frontend ya maneja.
            var cita = ChangeTracker.Entries()
                .Where(e => e.Entity is Cita &&
                       (e.State == EntityState.Added || e.State == EntityState.Modified))
                .Select(e => (Cita)e.Entity)
                .FirstOrDefault();
            throw new ConflictoHorarioException(
                cita?.FechaHora ?? DateTime.Now,
                cita?.FechaHoraFin ?? DateTime.Now);
        }
    }

    /// <summary>
    /// Detecta la violación del constraint de exclusión (SQLSTATE 23P01).
    /// </summary>
    private static bool EsViolacionExclusionTraslape(DbUpdateException ex)
        => ex.InnerException is PostgresException pg &&
           pg.SqlState == PostgresErrorCodes.ExclusionViolation;
}
