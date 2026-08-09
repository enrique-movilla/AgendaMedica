// ============================================================
//  AGENDA MÉDICA — DbContext ACTUALIZADO (v1.1)
//  Proyecto : AgendaMedica.Infrastructure / Data / AgendaDbContext.cs
// ============================================================
//  Cambios v1.1:
//  - Agrega DbSets para Departamento, Municipio, TipoEntidad, TipoUsuario
//  - Aseguradora rediseñada con nueva estructura
// ============================================================

using AgendaMedica.Domain.Entities;
using Microsoft.EntityFrameworkCore;
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

    // ── Catálogos propios ─────────────────────────────────────
    public DbSet<TipoIdentificacion>   TiposIdentificacion  { get; set; }
    public DbSet<Especialidad>         Especialidades       { get; set; }
    public DbSet<TipoCita>             TiposCita            { get; set; }
    public DbSet<Sede>                 Sedes                { get; set; }
    public DbSet<EstadoCitaCatalogo>   EstadosCita          { get; set; }

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
        return await base.SaveChangesAsync(ct);
    }
}
