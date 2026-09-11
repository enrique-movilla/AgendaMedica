# Sesión 2026-09-10 — Selector de recursos + perfiles simulados (MVP)

## Contexto
Validación de Front End de la pantalla Calendario (`AgendaView`). La lista de
recursos era una fila de botones que no escala (visual, rendimiento, operación
en PC/tablet/celular).

## Decisiones
1. **Opción 1+4**: buscador con autocompletado + chips + favoritos/recientes
   (carga diferida: solo se cargan las agendas de los seleccionados) + aviso
   de novedades (`✨ N nuevos`, `frontend/src/views/AgendaView.tsx`,
   componente `SelectorRecursos`).
2. **Restauración exacta**: la selección se persiste tal como queda
   (`agenda:{perfil}:recursos:seleccion`) y se restaura al recargar o al
   volver desde otra función. Los favoritos/recientes NO se preseleccionan;
   solo alimentan novedades y accesos rápidos.
3. **Perfiles simulados MVP** (`frontend/src/lib/perfil.ts`, `App.tsx`):
   Usuario 1 (azul) / Usuario 2 (verde) en el menú bajo "Identidad de
   Aplicación". Mismos permisos; cada perfil tiene su ambiente
   (`favoritos`, `seleccion`, `conocidos`, `recientes`). Lo heredado sin
   perfil migra **solo al Usuario 1**; el Usuario 2 arranca limpio.
   Sin cambios de backend/BD.
4. Commit `b9f8af0` en rama `inicio-de-agenda-general`, pusheado a `origin`.
   API re-desplegada en SmarterASP (4 DLL propios por FTP, swagger prod 200).
   Frontend pendiente de despliegue a Vercel (CLI sin sesión).

## Detalles técnicos
- Búsqueda insensible a tildes (`normalize NFD`), por nombre/especialidad/sede,
  tope de 60 sugerencias, Enter/Elegir, Escape/clic-fuera.
- `key={perfil}` en `AgendaView` para remontar al cambiar de perfil.
- Al cargar se depuran IDs borrados/inactivos contra la lista real.

## Incidentes y lecciones
- El dev server (Vite) se quedó sirviendo una versión intermedia tras ediciones
  seguidas (pestaña con claves `agenda:undefined:*`, imposibles con el código
  final). Se resolvió **reiniciando `npm run dev`**, no con Ctrl+F5.
  Si el navegador muestra algo imposible según el código en disco, reiniciar
  el dev server antes de seguir depurando.
- En PowerShell 5.1, `FtpWebRequest.Method` exige el enum
  (`[Net.WebRequestMethods+Ftp]::UploadFile`); asignar el string lanza
  excepción. En SmarterASP subir solo los DLL (`site1/`), nunca
  `appsettings.json` de producción.

## Pendiente (validadores + siguiente)
- Ítems Fase 2 (menú 3 puntos, filtros por estado), Fase 4 ítem 14 (Realtime).
- Dashboard de ocupación total a demanda (landing) — planteado, no iniciado.
- Credenciales SMTP + datos de prueba con email real (notificaciones).
