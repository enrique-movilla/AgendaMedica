// ============================================================
//  AGENDA MÉDICA — CONFIGURACIONES EF CORE — PACIENTE Y CITA v1.1
//  Proyecto : AgendaMedica.Infrastructure / Data / Configurations
//  Archivo  : PacienteProfesionalConfiguration.cs  (reemplaza v1.0)
// ============================================================

using AgendaMedica.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaMedica.Infrastructure.Data.Configurations;

// ── Paciente (v1.1) ───────────────────────────────────────────
public class PacienteConfiguration : IEntityTypeConfiguration<Paciente>
{
    public void Configure(EntityTypeBuilder<Paciente> b)
    {
        b.ToTable("Paciente");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.TipoIdentificacionId).IsRequired();
        b.Property(e => e.NumeroIdentificacion)
            .IsRequired().HasMaxLength(20).IsUnicode(false);
        b.Property(e => e.NombresCompletos)
            .IsRequired().HasMaxLength(200);
        b.Property(e => e.FechaNacimiento)
            .IsRequired().HasColumnType("date");
        b.Property(e => e.Sexo)
            .IsRequired().HasColumnType("char(1)").IsUnicode(false);
        b.Property(e => e.Celular)
            .HasMaxLength(20).IsUnicode(false);
        b.Property(e => e.Email)
            .HasMaxLength(150).IsUnicode(false);
        b.Property(e => e.Whatsapp)
            .HasMaxLength(20).IsUnicode(false);
        b.Property(e => e.AseguradoraId).IsRequired(false);
        b.Property(e => e.TipoUsuarioId).IsRequired(false);   // ← NUEVO
        b.Property(e => e.Empresa).HasMaxLength(150);
        b.Property(e => e.Activo)
            .IsRequired().HasDefaultValue(true);
        b.Property(e => e.FechaCreacion)
            .IsRequired().HasDefaultValueSql("now() at time zone 'utc'"); // 1. Corregido: Se quitaron los paréntesis extra ()
        b.Property(e => e.FechaModificacion).IsRequired(false);

        b.Ignore(e => e.EdadAnios);
        b.Ignore(e => e.EsMenorDeEdad);

        b.HasIndex(e => new { e.TipoIdentificacionId, e.NumeroIdentificacion })
            .IsUnique().HasDatabaseName("UQ_Paciente_Identificacion");

        b.ToTable(t =>
        {
            // 2. Corregido: Se quitaron corchetes y se adaptó a sintaxis PostgreSQL
            t.HasCheckConstraint("CK_Paciente_Sexo", "\"Sexo\" IN ('M','F')");
            t.HasCheckConstraint("CK_Paciente_FechaNac", "\"FechaNacimiento\" <= CURRENT_DATE");
        });

        b.HasOne(e => e.TipoIdentificacion)
            .WithMany(t => t.Pacientes)
            .HasForeignKey(e => e.TipoIdentificacionId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.Aseguradora)
            .WithMany(a => a.Pacientes)
            .HasForeignKey(e => e.AseguradoraId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // ← NUEVO
        b.HasOne(e => e.TipoUsuario)
            .WithMany(t => t.Pacientes)
            .HasForeignKey(e => e.TipoUsuarioId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

// ── Profesional (sin cambios) ─────────────────────────────────
public class ProfesionalConfiguration : IEntityTypeConfiguration<Profesional>
{
    public void Configure(EntityTypeBuilder<Profesional> b)
    {
        b.ToTable("Profesional");
        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();
        b.Property(e => e.TipoIdentificacionId).IsRequired();
        b.Property(e => e.NumeroIdentificacion)
            .IsRequired().HasMaxLength(20).IsUnicode(false);
        b.Property(e => e.NombresCompletos)
            .IsRequired().HasMaxLength(200);
        b.Property(e => e.Celular).HasMaxLength(20).IsUnicode(false);
        b.Property(e => e.Email).HasMaxLength(150).IsUnicode(false);
        b.Property(e => e.EspecialidadId).IsRequired();
        b.Property(e => e.SedeId).IsRequired();
        b.Property(e => e.ConsultorioSala).HasMaxLength(50);
        b.Property(e => e.RegistroMedico).HasMaxLength(30).IsUnicode(false);
        b.Property(e => e.Activo).IsRequired().HasDefaultValue(true);
        b.Property(e => e.FechaCreacion)
            .IsRequired().HasDefaultValueSql("now() at time zone 'utc'"); // ← Corregido: Sin ()
        b.Property(e => e.FechaModificacion).IsRequired(false);

        b.HasIndex(e => new { e.TipoIdentificacionId, e.NumeroIdentificacion })
            .IsUnique().HasDatabaseName("UQ_Profesional_Identificacion");

        b.HasOne(e => e.TipoIdentificacion)
            .WithMany(t => t.Profesionales)
            .HasForeignKey(e => e.TipoIdentificacionId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.Especialidad)
            .WithMany(e => e.Profesionales)
            .HasForeignKey(e => e.EspecialidadId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.Sede)
            .WithMany(s => s.Profesionales)
            .HasForeignKey(e => e.SedeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

// ── Cita (v1.1 - Corregido para PostgreSQL) ───────────────────────────────
public class CitaConfiguration : IEntityTypeConfiguration<Cita>
{
    public void Configure(EntityTypeBuilder<Cita> b)
    {
        b.ToTable("Cita");
        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.FechaHora).IsRequired().HasColumnType("timestamp(0)");
        b.Property(e => e.FechaHoraFin).IsRequired().HasColumnType("timestamp(0)");
        b.Property(e => e.PacienteId).IsRequired();
        b.Property(e => e.ProfesionalId).IsRequired();
        b.Property(e => e.TipoCitaId).IsRequired();
        b.Property(e => e.EstadoCitaId).IsRequired().HasDefaultValue((byte)1);
        b.Property(e => e.AseguradoraId).IsRequired(false);
        b.Property(e => e.TipoUsuarioId).IsRequired(false);
        b.Property(e => e.TeamsEventId).HasMaxLength(200).IsUnicode(false);
        b.Property(e => e.TeamsJoinUrl).HasMaxLength(500).IsUnicode(false);
        b.Property(e => e.MotivoConsulta).HasMaxLength(500);
        b.Property(e => e.Observaciones).HasMaxLength(1000);
        b.Property(e => e.CreadoPor).IsRequired().HasMaxLength(100).IsUnicode(false);
        b.Property(e => e.ModificadoPor).HasMaxLength(100).IsUnicode(false);
        b.Property(e => e.FechaCreacion)
            .IsRequired().HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'"); // ← Corregido: Sin ()
        b.Property(e => e.FechaModificacion)
            .HasColumnType("timestamp(0)").IsRequired(false);

        b.Ignore(e => e.Estado);
        b.Ignore(e => e.DuracionMinutos);

        // Genera la tabla aplicando comillas dobles en vez de corchetes
        b.ToTable(t => t.HasCheckConstraint("CK_Cita_Fechas", "\"FechaHoraFin\" > \"FechaHora\"")); // ← Corregido

        b.HasIndex(e => new { e.ProfesionalId, e.FechaHora })
            .HasDatabaseName("IX_Cita_Profesional_Fecha")
            .IncludeProperties(e => new { e.PacienteId, e.TipoCitaId, e.EstadoCitaId, e.TeamsEventId });

        b.HasIndex(e => new { e.PacienteId, e.FechaHora })
            .HasDatabaseName("IX_Cita_Paciente_Fecha");

        b.HasIndex(e => e.TeamsEventId)
            .HasDatabaseName("IX_Cita_TeamsEventId")
            .HasFilter("\"TeamsEventId\" IS NOT NULL"); // ← Corregido: Filtro optimizado

        b.HasIndex(e => new { e.EstadoCitaId, e.FechaHora })
            .HasDatabaseName("IX_Cita_Estado_Fecha");

        b.HasOne(e => e.Paciente)
            .WithMany(p => p.Citas)
            .HasForeignKey(e => e.PacienteId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.Profesional)
            .WithMany(p => p.Citas)
            .HasForeignKey(e => e.ProfesionalId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.TipoCita)
            .WithMany(t => t.Citas)
            .HasForeignKey(e => e.TipoCitaId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(e => e.Aseguradora)
            .WithMany(a => a.Citas)
            .HasForeignKey(e => e.AseguradoraId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasOne(e => e.TipoUsuario)
            .WithMany(t => t.Citas)
            .HasForeignKey(e => e.TipoUsuarioId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(e => e.Historial)
            .WithOne(h => h.Cita)
            .HasForeignKey(h => h.CitaId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(e => e.OutboxMensajes)
            .WithOne(o => o.Cita)
            .HasForeignKey(o => o.CitaId)
            .OnDelete(DeleteBehavior.Cascade);

        b.HasMany(e => e.Notificaciones)
            .WithOne(n => n.Cita)
            .HasForeignKey(n => n.CitaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

// ── HistorialEstadoCita, OutboxMensaje, NotificacionLog ───────
// (sin cambios respecto a v1.0)
public class HistorialEstadoCitaConfiguration
    : IEntityTypeConfiguration<HistorialEstadoCita>
{
    public void Configure(EntityTypeBuilder<HistorialEstadoCita> b)
    {
        b.ToTable("HistorialEstadoCita");
        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();
        b.Property(e => e.CitaId).IsRequired();
        b.Property(e => e.EstadoAnteriorId).IsRequired(false);
        b.Property(e => e.EstadoNuevoId).IsRequired();
        b.Property(e => e.Motivo).HasMaxLength(500);
        b.Property(e => e.CambiadoPor).IsRequired().HasMaxLength(100).IsUnicode(false);
        b.Property(e => e.FechaCambio)
            .IsRequired().HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'"); // ← Corregido: Sin ()
        b.Property(e => e.Origen)
            .IsRequired().HasMaxLength(30).IsUnicode(false).HasDefaultValue("App");
        b.HasIndex(e => new { e.CitaId, e.FechaCambio })
            .HasDatabaseName("IX_HistorialCita_CitaId");
    }
}

public class OutboxMensajeConfiguration : IEntityTypeConfiguration<OutboxMensaje>
{
    public void Configure(EntityTypeBuilder<OutboxMensaje> b)
    {
        b.ToTable("OutboxMensaje");
        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();
        b.Property(e => e.CitaId).IsRequired();
        b.Property(e => e.TipoOperacion).IsRequired().HasMaxLength(30).IsUnicode(false);
        b.Property(e => e.Payload).IsRequired().HasColumnType("jsonb").HasDefaultValue("{}");
        b.Property(e => e.Procesado).IsRequired().HasDefaultValue(false);
        b.Property(e => e.Intentos).IsRequired().HasDefaultValue((byte)0);
        b.Property(e => e.UltimoIntento).HasColumnType("timestamp(0)").IsRequired(false);
        b.Property(e => e.Error).HasMaxLength(1000);
        b.Property(e => e.FechaCreacion)
            .IsRequired().HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'"); // ← Corregido: Sin ()
        b.Property(e => e.FechaProcesado).HasColumnType("timestamp(0)").IsRequired(false);
        b.Ignore(e => e.PuedeReintentar);

        b.HasIndex(e => new { e.Procesado, e.Intentos })
            .HasDatabaseName("IX_Outbox_Pendiente")
            .HasFilter("\"Procesado\" = false"); // ← Corregido: Sintaxis Postgres para índices parciales
    }
}

public class NotificacionLogConfiguration : IEntityTypeConfiguration<NotificacionLog>
{
    public void Configure(EntityTypeBuilder<NotificacionLog> b)
    {
        b.ToTable("NotificacionLog");
        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();
        b.Property(e => e.CitaId).IsRequired();
        b.Property(e => e.Canal).IsRequired().HasMaxLength(20).IsUnicode(false);
        b.Property(e => e.Destinatario).IsRequired().HasMaxLength(150).IsUnicode(false);
        b.Property(e => e.TipoEvento).IsRequired().HasMaxLength(50).IsUnicode(false);
        b.Property(e => e.Estado).IsRequired().HasMaxLength(20).IsUnicode(false).HasDefaultValue("Pendiente");
        b.Property(e => e.Intentos).IsRequired().HasDefaultValue((byte)0);
        b.Property(e => e.UltimoIntento).HasColumnType("timestamp(0)").IsRequired(false);
        b.Property(e => e.Error).HasMaxLength(500);
        b.Property(e => e.FechaCreacion)
            .IsRequired().HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'"); // ← Corregido: Sin ()
        b.Ignore(e => e.PuedeReintentar);

        b.HasIndex(e => new { e.Estado, e.Canal, e.Intentos })
            .HasDatabaseName("IX_Notificacion_Pendiente")
            .HasFilter("\"Estado\" = 'Pendiente'"); // ← Corregido: Comillas dobles en el filtro del índice
    }
}

