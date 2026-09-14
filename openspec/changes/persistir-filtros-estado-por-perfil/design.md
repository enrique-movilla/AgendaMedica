## Context

`AgendaView.tsx:381` inicializa `estadosActivos` con todos los estados y
nunca lo persiste; `profIds` sí persiste por perfil vía
`leerIdsPerfil`/`guardarIdsPerfil` (`lib/perfil.ts`, claves
`agenda:{u1|u2}:recursos:{...}`). El efecto de carga (`:433-450`) incluye
`estadosActivos` en dependencias y filtra en cliente tras el fetch, de modo
que cada toggle hoy dispara un refetch innecesario. Ver propuesta (porqué)
y `specs/filtros-estado/spec.md` (requisitos).

## Goals / Non-Goals

**Goals:**

- Reusar el patrón de ambiente por perfil sin duplicar lógica.
- Eliminar el refetch al alternar estados (filtrar en memoria).

**Non-Goals:**

- Filtros en backend (`agenda-rango` sigue devolviendo todo el rango).
- Sincronización entre pestañas/dispositivos (solo `localStorage` local).

## Decisions

### Decisión 1: nueva clave `estados` en `perfil.ts`

Reusar `ClaveAmbiente` + `leerIdsPerfil`/`guardarIdsPerfil` añadiendo la
entrada `estados` al mapa `LEGADO` (con su clave heredada
`agenda:recursos:estados`, aunque hoy no exista: así una futura clave
huérfana también migraría a `u1`). Alternativa descartada: módulo aparte
de persistencia — duplicaría el manejo de perfil/legado ya probado.

### Decisión 2: filtrado en memoria, fetch sin `estadosActivos`

Sacar `estadosActivos` de las dependencias del efecto de carga y derivar
los items visibles con `useMemo` (`items.filter(...)`). Alternativa
descartada: mantener el refetch — funciona pero desperdicia llamadas al
pooler de Supabase en cada toggle.

### Decisión 3: valor inicial = guardado o todos

`useState(() => leerIdsPerfil(perfil, 'estados'))` con fallback a
`ESTADOS_CITA.map(id)` cuando el array guardado esté vacío (vacío =
"nunca guardó", no "todo desactivado"; el toggle impide de todos modos
dejar cero activos solo si el usuario los quita uno a uno — ese caso sí
se persiste tal cual). Al cambiar de perfil (`key={perfil}` en `App.tsx`
remonta la vista) se re-lee el ambiente del nuevo perfil. Efecto aparte
persiste cada cambio, igual que `profIds` (`:415-418`).

## Risks / Trade-offs

- [IDs de estado eliminados del catálogo quedan huérfanos en el array
  guardado] → filtrar contra `ESTADOS_CITA` vigentes al leer, como ya se
  hace con profesionales borrados (`:403-413).
- [Dos pestañas del mismo perfil divergen] → última escritura gana; fuera
  de alcance MVP (ver Non-Goals).
