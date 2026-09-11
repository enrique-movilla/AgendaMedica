# Sesión 2026-09-10 (continuación) — Reservas, catálogo y tablero

## 1. Reservas / Nueva asignación (`NuevaCitaView.tsx`, commit `4235b85`)
- **Cliente no seleccionado primero:** al pulsar "Nueva asignación" sin haber
  pulsado un cliente, el mismo `ModalError` muestra
  `t('MsgSeleccionarCliente')` y cancela la reserva. El resto de validaciones
  quedó después. Aviso bajo la lista mientras no haya selección.
- **Lista si >6 resultados:** con 6 o menos siguen los botones; con más, lista
  desplazable de selección única (✓ en el elegido) + aviso
  "Mostrando X de Y, refine la búsqueda…". Búsqueda ampliada a página de 20.
  Sin frecuentes/recientes (pendiente futuro).

## 2. Término `MsgSeleccionarCliente` = 49 (configurable por identidad)
- Enum `ClaveTermino` (`Domain/Enums/Enums.cs`) + seeds por vertical en
  `OtrosComandos.cs` y `SeedTodasVerticales.cs` (salud=paciente,
  resto=cliente; el seed solo inserta faltantes, no pisa personalizados).
- Frontend: `types.ts`, `CatalogoContext` (49 + default), `constants.ts`,
  `IdentidadView` (mapa + lista de creación); `NuevaCitaView` usa `t()`.
- Sembrado en Supabase tenant 1/default (id 244) vía `POST /v1/.../catalogo`
  directo (el `seed-all` expira por lentitud del pooler sin pooling).
- Despliegues 2026-09-10: API SmarterASP (4 DLL; 550 → recycle tocando
  `web.config`, swagger+term49 prod 200) y frontend Vercel (READY, 200).

## 3. Incidente perfiles: claves `agenda:undefined:*`
- El navegador mostraba claves con perfil `undefined` aun con código correcto
  en disco: el dev server (Vite) servía una transformada intermedia
  (observador no tomó los últimos cambios). **Solución: reiniciar
  `npm run dev`** (Ctrl+F5 no bastaba). Verificación: traer
  `/src/App.tsx` y `/src/views/AgendaView.tsx` del dev server y confirmar
  el código compilado actual.
- Lección registrada: si el navegador muestra algo imposible según disco,
  reiniciar el dev server antes de seguir depurando.
- Nota PowerShell: `FtpWebRequest.Method` exige el enum
  (`[Net.WebRequestMethods+Ftp]::UploadFile`), el string lanza excepción.

## 4. Análisis (sin código)
- **Vista general de ocupación:** 5 opciones con pros/contras (timeline
  genérico, matriz paginada, vista por vertical, dashboard configurable por
  datos, solo-huecos a demanda). Recomendación: matriz paginada a demanda.
- **Sub-app de configuración vs lazy:** se recomendó vista `lazy` dentro de
  la misma app (mismo beneficio sin doble pipeline); extraer después si
  justifica.
- **Especificación del tablero** guardada en
  `docs/TableroOcupacion_Especificacion.md` (v1 solo lectura; clic por celda
  con acciones de cita en fase 2).

## 5. Estado git
Rama `inicio-de-agenda-general` al día en `origin`: `4235b85` (funcional),
`fe0b4a9` (docs). Rama limpia.
