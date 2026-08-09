using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AgendaMedica.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InicializacionPostgresLimpia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Departamento",
                columns: table => new
                {
                    CodigoDane = table.Column<string>(type: "character varying(2)", unicode: false, maxLength: 2, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departamento", x => x.CodigoDane);
                });

            migrationBuilder.CreateTable(
                name: "Especialidad",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Especialidad", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EstadoCita",
                columns: table => new
                {
                    Id = table.Column<byte>(type: "smallint", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(30)", unicode: false, maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstadoCita", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sede",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Direccion = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Ciudad = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    Telefono = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sede", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoCita",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Categoria = table.Column<string>(type: "character varying(60)", unicode: false, maxLength: 60, nullable: false),
                    DuracionMinutos = table.Column<short>(type: "smallint", nullable: false, defaultValue: (short)30),
                    RequiereValidacion = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoCita", x => x.Id);
                    table.CheckConstraint("CK_TipoCita_Duracion", "[DuracionMinutos] BETWEEN 5 AND 480");
                });

            migrationBuilder.CreateTable(
                name: "TipoEntidad",
                columns: table => new
                {
                    Id = table.Column<byte>(type: "smallint", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(10)", unicode: false, maxLength: 10, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OtroNombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoEntidad", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoIdentificacion",
                columns: table => new
                {
                    Id = table.Column<byte>(type: "smallint", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(10)", unicode: false, maxLength: 10, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoIdentificacion", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TipoUsuario",
                columns: table => new
                {
                    Id = table.Column<byte>(type: "smallint", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(5)", unicode: false, maxLength: 5, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TipoUsuario", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Municipio",
                columns: table => new
                {
                    CodigoDane = table.Column<string>(type: "character varying(5)", unicode: false, maxLength: 5, nullable: false),
                    CodigoDepartamento = table.Column<string>(type: "character varying(2)", unicode: false, maxLength: 2, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValue: "Municipio"),
                    Longitud = table.Column<decimal>(type: "numeric(15,9)", nullable: true),
                    Latitud = table.Column<decimal>(type: "numeric(15,9)", nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Municipio", x => x.CodigoDane);
                    table.ForeignKey(
                        name: "FK_Municipio_Departamento_CodigoDepartamento",
                        column: x => x.CodigoDepartamento,
                        principalTable: "Departamento",
                        principalColumn: "CodigoDane",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Profesional",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TipoIdentificacionId = table.Column<byte>(type: "smallint", nullable: false),
                    NumeroIdentificacion = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: false),
                    NombresCompletos = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Celular = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "character varying(150)", unicode: false, maxLength: 150, nullable: true),
                    EspecialidadId = table.Column<int>(type: "integer", nullable: false),
                    SedeId = table.Column<int>(type: "integer", nullable: false),
                    ConsultorioSala = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    RegistroMedico = table.Column<string>(type: "character varying(30)", unicode: false, maxLength: 30, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Profesional", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Profesional_Especialidad_EspecialidadId",
                        column: x => x.EspecialidadId,
                        principalTable: "Especialidad",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Profesional_Sede_SedeId",
                        column: x => x.SedeId,
                        principalTable: "Sede",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Profesional_TipoIdentificacion_TipoIdentificacionId",
                        column: x => x.TipoIdentificacionId,
                        principalTable: "TipoIdentificacion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Aseguradora",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TipoEntidadId = table.Column<byte>(type: "smallint", nullable: false),
                    Codigo = table.Column<string>(type: "character varying(10)", unicode: false, maxLength: 10, nullable: false),
                    Sigla = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Gerente = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CodigoMunicipio = table.Column<string>(type: "character varying(5)", unicode: false, maxLength: 5, nullable: true),
                    Direccion = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Telefono = table.Column<string>(type: "character varying(80)", unicode: false, maxLength: 80, nullable: true),
                    Email = table.Column<string>(type: "character varying(150)", unicode: false, maxLength: 150, nullable: true),
                    Url = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UrlRed = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Aseguradora", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Aseguradora_Municipio_CodigoMunicipio",
                        column: x => x.CodigoMunicipio,
                        principalTable: "Municipio",
                        principalColumn: "CodigoDane",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Aseguradora_TipoEntidad_TipoEntidadId",
                        column: x => x.TipoEntidadId,
                        principalTable: "TipoEntidad",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Paciente",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TipoIdentificacionId = table.Column<byte>(type: "smallint", nullable: false),
                    NumeroIdentificacion = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: false),
                    NombresCompletos = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    FechaNacimiento = table.Column<DateOnly>(type: "date", nullable: false),
                    Sexo = table.Column<char>(type: "char(1)", unicode: false, nullable: false),
                    Celular = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "character varying(150)", unicode: false, maxLength: 150, nullable: true),
                    Whatsapp = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: true),
                    AseguradoraId = table.Column<int>(type: "integer", nullable: true),
                    TipoUsuarioId = table.Column<byte>(type: "smallint", nullable: true),
                    Empresa = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Paciente", x => x.Id);
                    table.CheckConstraint("CK_Paciente_FechaNac", "[FechaNacimiento] <= CAST(GETDATE() AS DATE)");
                    table.CheckConstraint("CK_Paciente_Sexo", "[Sexo] IN ('M','F')");
                    table.ForeignKey(
                        name: "FK_Paciente_Aseguradora_AseguradoraId",
                        column: x => x.AseguradoraId,
                        principalTable: "Aseguradora",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Paciente_TipoIdentificacion_TipoIdentificacionId",
                        column: x => x.TipoIdentificacionId,
                        principalTable: "TipoIdentificacion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Paciente_TipoUsuario_TipoUsuarioId",
                        column: x => x.TipoUsuarioId,
                        principalTable: "TipoUsuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Cita",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FechaHora = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false),
                    FechaHoraFin = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false),
                    PacienteId = table.Column<int>(type: "integer", nullable: false),
                    ProfesionalId = table.Column<int>(type: "integer", nullable: false),
                    TipoCitaId = table.Column<int>(type: "integer", nullable: false),
                    EstadoCitaId = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)1),
                    AseguradoraId = table.Column<int>(type: "integer", nullable: true),
                    TipoUsuarioId = table.Column<byte>(type: "smallint", nullable: true),
                    TeamsEventId = table.Column<string>(type: "character varying(200)", unicode: false, maxLength: 200, nullable: true),
                    TeamsJoinUrl = table.Column<string>(type: "character varying(500)", unicode: false, maxLength: 500, nullable: true),
                    MotivoConsulta = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Observaciones = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreadoPor = table.Column<string>(type: "character varying(100)", unicode: false, maxLength: 100, nullable: false),
                    ModificadoPor = table.Column<string>(type: "character varying(100)", unicode: false, maxLength: 100, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cita", x => x.Id);
                    table.CheckConstraint("CK_Cita_Fechas", "[FechaHoraFin] > [FechaHora]");
                    table.ForeignKey(
                        name: "FK_Cita_Aseguradora_AseguradoraId",
                        column: x => x.AseguradoraId,
                        principalTable: "Aseguradora",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Cita_Paciente_PacienteId",
                        column: x => x.PacienteId,
                        principalTable: "Paciente",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Cita_Profesional_ProfesionalId",
                        column: x => x.ProfesionalId,
                        principalTable: "Profesional",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Cita_TipoCita_TipoCitaId",
                        column: x => x.TipoCitaId,
                        principalTable: "TipoCita",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Cita_TipoUsuario_TipoUsuarioId",
                        column: x => x.TipoUsuarioId,
                        principalTable: "TipoUsuario",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "HistorialEstadoCita",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CitaId = table.Column<int>(type: "integer", nullable: false),
                    EstadoAnteriorId = table.Column<byte>(type: "smallint", nullable: true),
                    EstadoNuevoId = table.Column<byte>(type: "smallint", nullable: false),
                    Motivo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CambiadoPor = table.Column<string>(type: "character varying(100)", unicode: false, maxLength: 100, nullable: false),
                    FechaCambio = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    Origen = table.Column<string>(type: "character varying(30)", unicode: false, maxLength: 30, nullable: false, defaultValue: "App")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistorialEstadoCita", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HistorialEstadoCita_Cita_CitaId",
                        column: x => x.CitaId,
                        principalTable: "Cita",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificacionLog",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CitaId = table.Column<int>(type: "integer", nullable: false),
                    Canal = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: false),
                    Destinatario = table.Column<string>(type: "character varying(150)", unicode: false, maxLength: 150, nullable: false),
                    TipoEvento = table.Column<string>(type: "character varying(50)", unicode: false, maxLength: 50, nullable: false),
                    Estado = table.Column<string>(type: "character varying(20)", unicode: false, maxLength: 20, nullable: false, defaultValue: "Pendiente"),
                    Intentos = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)0),
                    UltimoIntento = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true),
                    Error = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificacionLog", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificacionLog_Cita_CitaId",
                        column: x => x.CitaId,
                        principalTable: "Cita",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OutboxMensaje",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CitaId = table.Column<int>(type: "integer", nullable: false),
                    TipoOperacion = table.Column<string>(type: "character varying(30)", unicode: false, maxLength: 30, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "{}"),
                    Procesado = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Intentos = table.Column<byte>(type: "smallint", nullable: false, defaultValue: (byte)0),
                    UltimoIntento = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true),
                    Error = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: false, defaultValueSql: "now() at time zone 'utc'()"),
                    FechaProcesado = table.Column<DateTime>(type: "timestamp(0) without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMensaje", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OutboxMensaje_Cita_CitaId",
                        column: x => x.CitaId,
                        principalTable: "Cita",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Aseguradora_CodigoMunicipio",
                table: "Aseguradora",
                column: "CodigoMunicipio");

            migrationBuilder.CreateIndex(
                name: "IX_Aseguradora_Nombre",
                table: "Aseguradora",
                column: "Nombre");

            migrationBuilder.CreateIndex(
                name: "IX_Aseguradora_TipoEntidad",
                table: "Aseguradora",
                column: "TipoEntidadId");

            migrationBuilder.CreateIndex(
                name: "UQ_Aseguradora_Codigo",
                table: "Aseguradora",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cita_AseguradoraId",
                table: "Cita",
                column: "AseguradoraId");

            migrationBuilder.CreateIndex(
                name: "IX_Cita_Estado_Fecha",
                table: "Cita",
                columns: new[] { "EstadoCitaId", "FechaHora" });

            migrationBuilder.CreateIndex(
                name: "IX_Cita_Paciente_Fecha",
                table: "Cita",
                columns: new[] { "PacienteId", "FechaHora" });

            migrationBuilder.CreateIndex(
                name: "IX_Cita_Profesional_Fecha",
                table: "Cita",
                columns: new[] { "ProfesionalId", "FechaHora" })
                .Annotation("Npgsql:IndexInclude", new[] { "PacienteId", "TipoCitaId", "EstadoCitaId", "TeamsEventId" });

            migrationBuilder.CreateIndex(
                name: "IX_Cita_TeamsEventId",
                table: "Cita",
                column: "TeamsEventId",
                filter: "[TeamsEventId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Cita_TipoCitaId",
                table: "Cita",
                column: "TipoCitaId");

            migrationBuilder.CreateIndex(
                name: "IX_Cita_TipoUsuarioId",
                table: "Cita",
                column: "TipoUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Departamento_Nombre",
                table: "Departamento",
                column: "Nombre");

            migrationBuilder.CreateIndex(
                name: "IX_Especialidad_Nombre",
                table: "Especialidad",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EstadoCita_Nombre",
                table: "EstadoCita",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HistorialCita_CitaId",
                table: "HistorialEstadoCita",
                columns: new[] { "CitaId", "FechaCambio" });

            migrationBuilder.CreateIndex(
                name: "IX_Municipio_Departamento",
                table: "Municipio",
                column: "CodigoDepartamento");

            migrationBuilder.CreateIndex(
                name: "IX_Municipio_Nombre",
                table: "Municipio",
                column: "Nombre");

            migrationBuilder.CreateIndex(
                name: "IX_Notificacion_Pendiente",
                table: "NotificacionLog",
                columns: new[] { "Estado", "Canal", "Intentos" },
                filter: "[Estado] = 'Pendiente'");

            migrationBuilder.CreateIndex(
                name: "IX_NotificacionLog_CitaId",
                table: "NotificacionLog",
                column: "CitaId");

            migrationBuilder.CreateIndex(
                name: "IX_Outbox_Pendiente",
                table: "OutboxMensaje",
                columns: new[] { "Procesado", "Intentos" },
                filter: "[Procesado] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMensaje_CitaId",
                table: "OutboxMensaje",
                column: "CitaId");

            migrationBuilder.CreateIndex(
                name: "IX_Paciente_AseguradoraId",
                table: "Paciente",
                column: "AseguradoraId");

            migrationBuilder.CreateIndex(
                name: "IX_Paciente_TipoUsuarioId",
                table: "Paciente",
                column: "TipoUsuarioId");

            migrationBuilder.CreateIndex(
                name: "UQ_Paciente_Identificacion",
                table: "Paciente",
                columns: new[] { "TipoIdentificacionId", "NumeroIdentificacion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Profesional_EspecialidadId",
                table: "Profesional",
                column: "EspecialidadId");

            migrationBuilder.CreateIndex(
                name: "IX_Profesional_SedeId",
                table: "Profesional",
                column: "SedeId");

            migrationBuilder.CreateIndex(
                name: "UQ_Profesional_Identificacion",
                table: "Profesional",
                columns: new[] { "TipoIdentificacionId", "NumeroIdentificacion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TipoCita_Nombre",
                table: "TipoCita",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TipoEntidad_Codigo",
                table: "TipoEntidad",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TipoIdentificacion_Codigo",
                table: "TipoIdentificacion",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TipoUsuario_Codigo",
                table: "TipoUsuario",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EstadoCita");

            migrationBuilder.DropTable(
                name: "HistorialEstadoCita");

            migrationBuilder.DropTable(
                name: "NotificacionLog");

            migrationBuilder.DropTable(
                name: "OutboxMensaje");

            migrationBuilder.DropTable(
                name: "Cita");

            migrationBuilder.DropTable(
                name: "Paciente");

            migrationBuilder.DropTable(
                name: "Profesional");

            migrationBuilder.DropTable(
                name: "TipoCita");

            migrationBuilder.DropTable(
                name: "Aseguradora");

            migrationBuilder.DropTable(
                name: "TipoUsuario");

            migrationBuilder.DropTable(
                name: "Especialidad");

            migrationBuilder.DropTable(
                name: "Sede");

            migrationBuilder.DropTable(
                name: "TipoIdentificacion");

            migrationBuilder.DropTable(
                name: "Municipio");

            migrationBuilder.DropTable(
                name: "TipoEntidad");

            migrationBuilder.DropTable(
                name: "Departamento");
        }
    }
}
