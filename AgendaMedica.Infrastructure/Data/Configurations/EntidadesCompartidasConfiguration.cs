// ============================================================
//  AGENDA MÉDICA — CONFIGURACIONES EF CORE — ENTIDADES COMPARTIDAS (v1.2)
//  Proyecto : AgendaMedica.Infrastructure / Data / Configurations
//  Archivo  : EntidadesCompartidasConfiguration.cs
// ============================================================
//  Corrección v1.2: relaciones configuradas como unidireccionales
//  con WithMany() sin argumento — EF no busca colección inversa.
// ============================================================

using AgendaMedica.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaMedica.Infrastructure.Data.Configurations;

// ── Departamento ──────────────────────────────────────────────
public class DepartamentoConfiguration : IEntityTypeConfiguration<Departamento>
{
    public void Configure(EntityTypeBuilder<Departamento> b)
    {
        b.ToTable("Departamento");

        b.HasKey(e => e.CodigoDane);
        b.Property(e => e.CodigoDane)
            .HasMaxLength(2)
            .IsUnicode(false)
            .ValueGeneratedNever();

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(80);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.HasIndex(e => e.Nombre)
            .HasDatabaseName("IX_Departamento_Nombre");
    }
}

// ── Municipio ─────────────────────────────────────────────────
public class MunicipioConfiguration : IEntityTypeConfiguration<Municipio>
{
    public void Configure(EntityTypeBuilder<Municipio> b)
    {
        b.ToTable("Municipio");

        b.HasKey(e => e.CodigoDane);
        b.Property(e => e.CodigoDane)
            .HasMaxLength(5)
            .IsUnicode(false)
            .ValueGeneratedNever();

        b.Property(e => e.CodigoDepartamento)
            .IsRequired()
            .HasMaxLength(2)
            .IsUnicode(false);

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(100);

        b.Property(e => e.Tipo)
            .IsRequired()
            .HasMaxLength(40)
            .HasDefaultValue("Municipio");

        b.Property(e => e.Longitud)
            .HasColumnType("decimal(15,9)")
            .IsRequired(false);

        b.Property(e => e.Latitud)
            .HasColumnType("decimal(15,9)")
            .IsRequired(false);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.Ignore(e => e.CodigoDepartamentoCalculado);

        // ← WithMany() sin argumento = relación unidireccional
        // EF no busca ICollection<Municipio> en Departamento
        b.HasOne(e => e.Departamento)
            .WithMany()
            .HasForeignKey(e => e.CodigoDepartamento)
            .HasPrincipalKey(d => d.CodigoDane)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(e => e.CodigoDepartamento)
            .HasDatabaseName("IX_Municipio_Departamento");

        b.HasIndex(e => e.Nombre)
            .HasDatabaseName("IX_Municipio_Nombre");
    }
}

// ── TipoEntidad ───────────────────────────────────────────────
public class TipoEntidadConfiguration : IEntityTypeConfiguration<TipoEntidad>
{
    public void Configure(EntityTypeBuilder<TipoEntidad> b)
    {
        b.ToTable("TipoEntidad");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).ValueGeneratedNever();

        b.Property(e => e.Codigo)
            .IsRequired()
            .HasMaxLength(10)
            .IsUnicode(false);

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(100);

        b.Property(e => e.OtroNombre)
            .HasMaxLength(100);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.HasIndex(e => e.Codigo).IsUnique();
    }
}

// ── TipoUsuario ───────────────────────────────────────────────
public class TipoUsuarioConfiguration : IEntityTypeConfiguration<TipoUsuario>
{
    public void Configure(EntityTypeBuilder<TipoUsuario> b)
    {
        b.ToTable("TipoUsuario");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).ValueGeneratedNever();

        b.Property(e => e.Codigo)
            .IsRequired()
            .HasMaxLength(5)
            .IsUnicode(false);

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(150);

        b.Property(e => e.Activo)
            .IsRequired()
            .HasDefaultValue(true);

        b.HasIndex(e => e.Codigo).IsUnique();
    }
}

// ── Aseguradora ───────────────────────────────────────────────
public class AseguradoraConfiguration : IEntityTypeConfiguration<Aseguradora>
{
    public void Configure(EntityTypeBuilder<Aseguradora> b)
    {
        b.ToTable("Aseguradora");

        b.HasKey(e => e.Id);
        b.Property(e => e.Id).UseIdentityColumn();

        b.Property(e => e.TipoEntidadId).IsRequired();

        b.Property(e => e.Codigo)
            .IsRequired()
            .HasMaxLength(10)
            .IsUnicode(false);

        b.Property(e => e.Sigla)
            .IsRequired()
            .HasMaxLength(60);

        b.Property(e => e.Nombre)
            .IsRequired()
            .HasMaxLength(300);

        b.Property(e => e.Gerente).HasMaxLength(200);

        b.Property(e => e.CodigoMunicipio)
            .HasMaxLength(5)
            .IsUnicode(false)
            .IsRequired(false);

        b.Property(e => e.Direccion).HasMaxLength(255);
        b.Property(e => e.Telefono).HasMaxLength(80).IsUnicode(false);
        b.Property(e => e.Email).HasMaxLength(150).IsUnicode(false);
        b.Property(e => e.Url).HasMaxLength(255);
        b.Property(e => e.UrlRed).HasMaxLength(255);

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

        b.HasIndex(e => e.Codigo)
            .IsUnique()
            .HasDatabaseName("UQ_Aseguradora_Codigo");

        b.HasIndex(e => e.Nombre)
            .HasDatabaseName("IX_Aseguradora_Nombre");

        b.HasIndex(e => e.TipoEntidadId)
            .HasDatabaseName("IX_Aseguradora_TipoEntidad");

        // ← WithMany() sin argumento = unidireccional
        // EF no busca ICollection<Aseguradora> en TipoEntidad
        b.HasOne(e => e.TipoEntidad)
            .WithMany()
            .HasForeignKey(e => e.TipoEntidadId)
            .OnDelete(DeleteBehavior.Restrict);

        // ← WithMany() sin argumento = unidireccional
        // EF no busca ICollection<Aseguradora> en Municipio
        // que es lo que generaba DepartamentoCodigoDane
        b.HasOne(e => e.Municipio)
            .WithMany()
            .HasForeignKey(e => e.CodigoMunicipio)
            .HasPrincipalKey(m => m.CodigoDane)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
