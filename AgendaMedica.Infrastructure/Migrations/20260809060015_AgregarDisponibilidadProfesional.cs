using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgendaMedica.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AgregarDisponibilidadProfesional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DisponibilidadProfesional",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProfesionalId = table.Column<int>(type: "integer", nullable: false),
                    DiaSemana = table.Column<byte>(type: "smallint", nullable: false),
                    HoraInicio = table.Column<TimeSpan>(type: "time", nullable: false),
                    HoraFin = table.Column<TimeSpan>(type: "time", nullable: false),
                    DuracionMinutos = table.Column<short>(type: "smallint", nullable: false),
                    SedeId = table.Column<int>(type: "integer", nullable: true),
                    ConsultorioSala = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DisponibilidadProfesional", x => x.Id);
                    table.CheckConstraint("CK_Disponibilidad_Duracion", "\"DuracionMinutos\" BETWEEN 5 AND 480");
                    table.CheckConstraint("CK_Disponibilidad_Rango", "\"HoraFin\" > \"HoraInicio\"");
                    table.ForeignKey(
                        name: "FK_DisponibilidadProfesional_Profesional_ProfesionalId",
                        column: x => x.ProfesionalId,
                        principalTable: "Profesional",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Disponibilidad_Profesional_Dia",
                table: "DisponibilidadProfesional",
                columns: new[] { "ProfesionalId", "DiaSemana" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DisponibilidadProfesional");
        }
    }
}