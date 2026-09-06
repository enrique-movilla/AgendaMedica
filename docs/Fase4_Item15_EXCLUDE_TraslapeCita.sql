-- ============================================================
--  AGENDA MÉDICA — FASE 4 ÍTEM 15
--  Constraint EXCLUDE de no-solapamiento de citas a nivel BD
--  Ejecutar en el SQL Editor de Supabase, en orden (PASO 0 → 3).
-- ============================================================
--  Replica en BD la regla de CitaRepository.ExisteTraslapeAsync
--  (mismo profesional + rangos que se cruzan, excluyendo
--  Cancelada=5 y NoAsistio=6). Cierra la condición de carrera
--  del check-then-insert: dos INSERT concurrentes del mismo slot,
--  uno falla con SQLSTATE 23P01, que la API traduce a 409
--  HORARIO_OCUPADO (AgendaDbContext.SaveChangesAsync).
--
--  NOTA: tsrange(a,b) usa cotas [a,b) por defecto, que equivale
--  exacto al check de la app (FechaHora < fin AND FechaHoraFin >
--  inicio): turnos adyacentes (fin == inicio) NO se traslapan.
-- ============================================================

-- ── PASO 0 (diagnóstico, solo lectura) ────────────────────────
-- Si devuelve filas, hay que depurar esos traslapes (cancelar o
-- mover una de las dos citas) ANTES del PASO 2, porque PostgreSQL
-- no crea el constraint si ya existen violaciones.
SELECT a."Id"            AS "CitaA",
       b."Id"            AS "CitaB",
       a."ProfesionalId" AS "ProfesionalId",
       a."FechaHora"     AS "InicioA",
       a."FechaHoraFin"  AS "FinA",
       b."FechaHora"     AS "InicioB",
       b."FechaHoraFin"  AS "FinB"
FROM "Cita" a
JOIN "Cita" b
  ON a."ProfesionalId" = b."ProfesionalId"
 AND a."Id" < b."Id"
 AND a."FechaHora"    < b."FechaHoraFin"
 AND a."FechaHoraFin" > b."FechaHora"
WHERE a."EstadoCitaId" NOT IN (5, 6)
  AND b."EstadoCitaId" NOT IN (5, 6);

-- ── PASO 1: extensión para GiST sobre enteros ─────────────────
-- btree_gist está en la lista de extensiones permitidas de Supabase.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── PASO 2: constraint de exclusión (idempotente) ─────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'EX_Cita_Profesional_SinTraslape'
    ) THEN
        ALTER TABLE "Cita"
            ADD CONSTRAINT "EX_Cita_Profesional_SinTraslape"
            EXCLUDE USING gist (
                "ProfesionalId" WITH =,
                tsrange("FechaHora", "FechaHoraFin") WITH &&
            )
            -- Solo citas que ocupan turno (5=Cancelada, 6=NoAsistio no bloquean)
            WHERE ("EstadoCitaId" NOT IN (5, 6));
    END IF;
END $$;

-- ── PASO 3: registrar en el historial de migraciones EF ───────
-- (misma convención que las Fases 1-3: DDL directo + INSERT,
--  sin dotnet ef database update).
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260906050000_AgregarExclusionTraslapeCita', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;

-- ── PASO 4 (verificación) ─────────────────────────────────────
-- Debe mostrar el constraint en la tabla Cita:
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conname = 'EX_Cita_Profesional_SinTraslape';
