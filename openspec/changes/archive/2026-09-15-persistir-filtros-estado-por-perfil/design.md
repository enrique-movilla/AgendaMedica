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

`useState(() => ...)` con `leerIdsPerfil(perfil, 'estados')`, depurando
huérfanos contra `ESTADOS_CITA`. Para distinguir "nunca guardó" (→ todos)
de "todo desactivado a propósito" (→ `[]` respetado) se usa el helper
nuevo `hayAmbienteGuardado(perfil, clave)` en `perfil.ts` (revisa clave
propia + heredada); si hay guardado no vacío pero todo huérfano, se
recupera a todos. Al cambiar de perfil (`key={perfil}` en `App.tsx`
remonta la vista) se re-lee el ambiente del nuevo perfil. Efecto aparte
persiste cada cambio, igual que `profIds`.

### Decisión 4: vista como texto con validación

La vista es `string`, no `number[]`, así que no cabe en
`leerIdsPerfil`/`guardarIdsPerfil`: se añaden `leerVistaPerfil` /
`guardarVistaPerfil` en `perfil.ts` (clave
`agenda:{u1|u2}:recursos:vista` + legado `agenda:recursos:vista` → `u1`).
Al leer se valida contra las 4 pestañas; cualquier otro valor → diario.
Efecto de persistencia igual que el de filtros.

### Decisión 5: botón "Restablecer" con literal

`setEstadosActivos(todos) + setVista('diario') + setFecha(hoy)` (+ rango
de lista a sus iniciales); los efectos existentes persisten el resultado
y la selección de recursos/favoritos/frecuentes no se toca. Texto como
literal `'Restablecer'` (precedente: `'Limpiar'` en `SelectorRecursos`
del mismo archivo) para evitar el ritual completo de clave de catálogo
(backend + seeds + Supabase) por un solo botón.

## Risks / Trade-offs
- [IDs de estado eliminados del catálogo quedan huérfanos en el array
  guardado] → filtrar contra `ESTADOS_CITA` vigentes al leer, como ya se
  hace con profesionales borrados (`:403-413).
- [Dos pestañas del mismo perfil divergen] → última escritura gana; fuera
  de alcance MVP (ver Non-Goals).
