# Tasks

## 1. Menú con acciones directas

- [ ] 1.1 Extender `MenuTresPuntos` en `frontend/src/views/AgendaView.tsx` con opciones Reprogramar/Duplicar/Cancelar (visibilidad por estado 1/2/7 y 1/2/3/7) y verificar con `npm.cmd run build` en `frontend/` que compila sin errores
- [ ] 1.2 Agregar prop `accionInicial` a `PanelDetalleCita` (aplicada solo al cambiar de cita) y conectar `onAccion` del menú, verificando que Reprogramar deja el form de fecha abierto y Cancelar el de motivo

## 2. Duplicar y etiqueta de catálogo

- [ ] 2.1 Implementar `onDuplicar` (hint con fecha/profesional/motivo origen y tipo resuelto por nombre) y verificar en `http://localhost:5173` que Nueva asignación abre precargada y el guardado valida traslape
- [ ] 2.2 Registrar `AccionDuplicar` (enum + seeds por vertical + `types.ts`/`CatalogoContext`/`constants.ts`/`IdentidadView`), sembrar en Supabase tenant 1/default y verificar con `GET /v1/catalogo` que el término existe

## 3. Verificación de integración

- [ ] 3.1 Verificar en `http://localhost:5173` en vista diaria: reprogramar y cancelar desde el menú actualizan la timeline (incluido cancelar sin motivo muestra error), el menú oculta acciones no permitidas por estado, y `dotnet build AgendaMedica.sln` sigue en verde si se tocó backend
