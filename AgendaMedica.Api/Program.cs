// ============================================================
//  AGENDA MÉDICA — Program.cs ACTUALIZADO
//  Proyecto : AgendaMedica.Api
// ============================================================
//  Agrega la capa de Application (MediatR) y el middleware
//  de manejo global de excepciones del dominio.
// ============================================================

using AgendaMedica.Application;
using AgendaMedica.Domain.Exceptions;
using AgendaMedica.Infrastructure;
using System.Net;
using System.Text.Json;

// Npgsql: permite enviar DateTime con Kind=Utc hacia columnas
// 'timestamp without time zone' (esquema heredado de SQL Server).
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ── 1. Controladores y Swagger ────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Agenda Médica API",
        Version = "v1",
        Description = "API REST para la gestión de citas y agenda médica."
    });
});

// ── 2. Infraestructura (DbContext + Repositorios) ─────────────
builder.Services.AddInfrastructure(builder.Configuration);

// ── 3. Aplicación (MediatR + Commands + Queries) ──────────────
builder.Services.AddApplication();

// ── 4. CORS ───────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AgendaPolicy", policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("AllowedOrigins")
                       .Get<string[]>() ?? new[] { "http://localhost:3000" })
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── 5. Middleware global de excepciones ───────────────────────
// Captura las excepciones del dominio y devuelve HTTP correcto
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (EntidadNoEncontradaException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.NotFound;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            codigo = "NO_ENCONTRADO",
            mensaje = ex.Message
        }));
    }
    catch (ConflictoHorarioException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.Conflict;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            codigo = "HORARIO_OCUPADO",
            mensaje = ex.Message
        }));
    }
    catch (EntidadDuplicadaException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.Conflict;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            codigo = "DUPLICADO",
            mensaje = ex.Message
        }));
    }
    catch (DomainException ex)
    {
        context.Response.StatusCode = 422;   // Unprocessable Entity
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            codigo = "REGLA_NEGOCIO",
            mensaje = ex.Message
        }));
    }
});

// ── 6. Pipeline ───────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Agenda Médica API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("AgendaPolicy");
app.UseAuthorization();
app.MapControllers();

// ── 7. Verificar conexión a BD al arrancar ────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider
                  .GetRequiredService<AgendaMedica.Infrastructure.Data.AgendaDbContext>();
    try
    {
        await db.Database.CanConnectAsync();
        Console.WriteLine("✅ Conexión a Supabase (PostgreSQL): OK");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error al conectar con Supabase (PostgreSQL): {ex.Message}");
    }
}

app.Run();
