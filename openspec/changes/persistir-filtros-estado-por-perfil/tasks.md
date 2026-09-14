## 1. Persistencia por perfil

- [x] 1.1 Agregar la clave `estados` al ambiente de `frontend/src/lib/perfil.ts` (mapa `LEGADO` + tipos) y verificar con `npm.cmd run build` en `frontend/` que compila sin errores
- [x] 1.2 Inicializar `estadosActivos` en `AgendaView.tsx` desde `leerIdsPerfil(perfil, 'estados')` con fallback a todos los estados, depurando IDs huérfanos contra `ESTADOS_CITA`, y verificar que al recargar se conserva la selección
- [x] 1.3 Persistir cada cambio de `estadosActivos` con `guardarIdsPerfil` (efecto como el de `profIds`) y verificar que al cambiar de perfil `u1`/`u2` cada uno conserva sus propios filtros

## 2. Filtrado en memoria

- [x] 2.1 Sacar `estadosActivos` de las dependencias del efecto de carga de `agendaRango` y derivar items visibles con `useMemo`, verificando en la pestaña de red que alternar un chip no dispara llamadas a `/v1/citas/agenda-rango`

## 3. Verificación de integración

- [ ] 3.1 Verificar el ciclo completo en `http://localhost:5173`: desactivar estados, recargar, cambiar de perfil y volver, pulsar "Todos", confirmando que las 4 vistas (diario/semanal/mensual/lista) respetan el filtro
