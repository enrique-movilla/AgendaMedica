using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaMedica.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SincronizarModeloFase3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sincronización de snapshot SIN cambios en BD (convención del
            // repo: DDL directo en Supabase + INSERT en __EFMigrationsHistory).
            // Al generar esta migración el diff modelo-vs-snapshot era:
            //  - CreateTable BloqueoAgenda, ExcepcionHoraria,
            //    MotivoCancelacion, CatalogoTermino (+ sus índices)
            //  - CreateIndex IX_Sede_Nombre (único)
            //  - AlterColumn FechaCreacion en TipoCita/Sede/Especialidad/
            //    Aseguradora (corrección del default 'utc'() → 'utc')
            // Todo ya existe en Supabase (verificado 2026-09-06), por eso
            // el Up queda vacío: solo se actualiza el snapshot del modelo.
            // NO ejecutar 'dotnet ef database update' con esta migración.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Sin reversa: el Up no aplicó ningún cambio en BD.
        }
    }
}
