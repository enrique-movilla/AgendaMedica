// ============================================================
//  AGENDA MÉDICA — CONFIGURACIONES EF CORE — CATÁLOGOS (v1.1)
//  Proyecto : AgendaMedica.Infrastructure / Data / Configurations
// ============================================================
//  Versión 1.1: Las tablas de catálogo ahora tienen
//  FechaCreacion y FechaModificacion (agregadas con el ALTER).
//  EF Core las mapea y las actualiza automáticamente via
//  el interceptor SaveChangesAsync del AgendaDbContext.
// ============================================================

using AgendaMedica.Domain.Entities;
using AgendaMedica.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaMedica.Infrastructure.Data.Configurations;

// ── TipoIdentificacion ────────────────────────────────────────
public class TipoIdentificacionConfiguration
    : IEntityTypeConfiguration<AgendaMedica.Domain.Entities.TipoIdentificacion>
{
    public void Configure(EntityTypeBuilder<AgendaMedica.Domain.Entities.TipoIdentificacion> b)
    {
        b.ToTable("TipoIdentificacion");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).ValueGeneratedNever();

        b.Property(e => e.Codigo)
            .IsRequired()
            .HasMaxLength(10)
            .IsUnicode(false);

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(60);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.HasIndex(e => e.Codigo).IsUnique();
    }
}

// ── EstadoCitaCatalogo ────────────────────────────────────────
public class EstadoCitaConfiguration
    : IEntityTypeConfiguration<EstadoCitaCatalogo>
{
    public void Configure(EntityTypeBuilder<EstadoCitaCatalogo> b)
    {
        b.ToTable("EstadoCita");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).ValueGeneratedNever();

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(30)
            .IsUnicode(false);

        b.HasIndex(e => e.Nombre).IsUnique();
    }
}

// ── Especialidad ──────────────────────────────────────────────
public class EspecialidadConfiguration
    : IEntityTypeConfiguration<Especialidad>
{
    public void Configure(EntityTypeBuilder<Especialidad> b)
    {
        b.ToTable("Especialidad");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(100);

        b.Property(e => e.Descripcion)
            .HasMaxLength(255);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.Property(e => e.FechaCreacion)
            .IsRequired()
            .HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'()");

        b.Property(e => e.FechaModificacion)
            .HasColumnType("timestamp(0)")
            .IsRequired(false);

        b.HasIndex(e => e.Nombre).IsUnique();
    }
}

// ── TipoCita ──────────────────────────────────────────────────
public class TipoCitaConfiguration
    : IEntityTypeConfiguration<TipoCita>
{
    public void Configure(EntityTypeBuilder<TipoCita> b)
    {
        b.ToTable("TipoCita");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(100);

        b.Property(e => e.Categoria)
            .IsRequired()
            .HasMaxLength(60)
            .IsUnicode(false);

        b.Property(e => e.DuracionMinutos)
            .IsRequired()
            .HasDefaultValue((short)30);

        b.Property(e => e.RequiereValidacion)
            .IsRequired()
            .HasDefaultValue(false);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.Property(e => e.FechaCreacion)
            .IsRequired()
            .HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'()");

        b.Property(e => e.FechaModificacion)
            .HasColumnType("timestamp(0)")
            .IsRequired(false);

        b.HasIndex(e => e.Nombre).IsUnique();

        b.ToTable(t => t.HasCheckConstraint(
            "CK_TipoCita_Duracion",
            "[DuracionMinutos] BETWEEN 5 AND 480"));
    }
}

// ── Sede ──────────────────────────────────────────────────────
public class SedeConfiguration
    : IEntityTypeConfiguration<Sede>
{
    public void Configure(EntityTypeBuilder<Sede> b)
    {
        b.ToTable("Sede");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(150);

        b.Property(e => e.Direccion)
            .HasMaxLength(255);

        b.Property(e => e.Ciudad)
            .HasMaxLength(80);

        b.Property(e => e.Telefono)
            .HasMaxLength(20)
            .IsUnicode(false);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

b.Property(e => e.FechaCreacion)
            .IsRequired()
            .HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'()");

        b.Property(e => e.FechaModificacion)
            .HasColumnType("timestamp(0)")
            .IsRequired(false);

        b.HasIndex(e => e.Nombre).IsUnique();
    }
}

// ── CatalogoTermino ────────────────────────────────────────────
public class CatalogoTerminoConfiguration
    : IEntityTypeConfiguration<CatalogoTermino>
{
    public void Configure(EntityTypeBuilder<CatalogoTermino> b)
    {
        b.ToTable("CatalogoTermino");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.TenantId)
            .IsRequired();

        b.Property(e => e.Vertical)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("default");

        b.Property(e => e.Clave)
            .IsRequired()
            .HasConversion<byte>();

        b.Property(e => e.Valor)
            .IsRequired()
            .HasMaxLength(200);

        b.Property(e => e.Categoria)
            .IsRequired()
            .HasMaxLength(50);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.Property(e => e.FechaCreacion)
            .IsRequired()
            .HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'()");

        b.Property(e => e.FechaModificacion)
            .HasColumnType("timestamp(0)")
            .IsRequired(false);

        // Índice único por tenant + vertical + clave
        b.HasIndex(e => new { e.TenantId, e.Vertical, e.Clave }).IsUnique();

        // Índice por tenant + vertical + categoría
        b.HasIndex(e => new { e.TenantId, e.Vertical, e.Categoria });
    }
}

// ── MotivoCancelacion ──────────────────────────────────────────
public class MotivoCancelacionConfiguration
    : IEntityTypeConfiguration<MotivoCancelacion>
{
    public void Configure(EntityTypeBuilder<MotivoCancelacion> b)
    {
        b.ToTable("MotivoCancelacion");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(150);

        b.Property(e => e.Descripcion)
            .HasMaxLength(255);

        b.Property(e => e.Orden)
            .IsRequired()
            .HasDefaultValue((short)0);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.Property(e => e.FechaCreacion)
            .IsRequired()
            .HasColumnType("timestamp(0)")
            .HasDefaultValueSql("now() at time zone 'utc'()");

        b.Property(e => e.FechaModificacion)
            .HasColumnType("timestamp(0)")
            .IsRequired(false);

        b.HasIndex(e => e.Nombre).IsUnique();
    }
}
