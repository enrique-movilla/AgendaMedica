# PreContexto — Cómo armar la agenda médica

> Documento de requerimientos de referencia. Convertido a Markdown desde
> `PreContexto de como armar la agenda médica.txt`. Se analiza y aplica al
> proyecto en `docs/Contexto_Agenda_UIUX.md`.

Las pantallas de agendas se dividen en vistas de asignación (crear), revisión
(consultar) y mantenimiento (editar/cancelar). Una buena interfaz conocida usa
bloques de color por estado y menús flotantes rápidos.

## Pantalla de Asignación (Crear y Reservar)

- **Formulario modal limpio:** campos para título, fecha, hora de inicio y fin, y selector de recursos o personal.
- **Buscador de disponibilidad:** vista dual que cruza los espacios libres del usuario con los del invitado o sala.
- **Código de colores inicial:** permite etiquetar el tipo de evento (reunión, mantenimiento, cita médica) desde el primer clic.

## Pantalla de Revisión (Consultar y Filtrar)

- **Vista de calendario múltiple:** pestañas para alternar rápido entre formato diario, semanal, mensual o de lista.
- **Panel lateral de detalles:** al hacer clic sobre un bloque de la agenda se despliega una tarjeta lateral con la información completa sin salir de la vista general.
- **Filtros por estado:** botones o casillas para ocultar o mostrar eventos completados, pendientes o cancelados.

## Pantalla de Mantenimiento (Editar y Mantener)

- **Acciones rápidas por arrastre (drag & drop):** mover un bloque de hora a otra fecha de manera visual actualiza el registro en tiempo real.
- **Menú contextual de tres puntos:** opciones directas para "Reprogramar", "Duplicar" o "Eliminar/Cancelar".
- **Historial de cambios:** sección de notas o registro de actividad que muestra quién creó la cita o si sufrió modificaciones previas.

En el sector médico asistencial, el diseño de la agenda debe resolver flujos
complejos como la gestión de turnos urgentes, la disponibilidad de múltiples
especialistas y la asignación de consultorios o equipos médicos específicos.

---

## Pantallas de Asignación (Crear y Reservar)

Esta interfaz debe agilizar el proceso de agendamiento en recepción o call
centers para evitar cuellos de botella.

- **Filtro de Entidades Cruzadas:** permite seleccionar simultáneamente la Especialidad (ej. Cardiología), el Profesional, la Sede y la Obra Social o Seguro Médico del paciente antes de ver los huecos libres.
- **Buscador Próximo Turno Disponible:** botón inteligente que salta automáticamente a la primera fecha con espacio libre para el médico seleccionado, evitando que el recepcionista busque manualmente mes a mes.
- **Bloqueo Preventivo de Turno:** al abrir el formulario de asignación, el sistema congela ese espacio temporalmente por 5 minutos para que otro operador no agende en el mismo microsegundo.
- **Formulario de Registro Rápido:** casillas simplificadas para ingresar el documento de identidad (DNI/Cédula). Si el paciente ya existe, se auto-completan los datos; si es nuevo, se abre un sub-formulario sin cerrar la agenda.

## Pantallas de Revisión (Consultar y Filtrar)

Diseñada para que el personal administrativo y los médicos comprendan la carga
de trabajo diaria de un solo vistazo.

- **Vista de Línea de Tiempo Multifila (Timeline multi-recurso):** el eje vertical muestra las horas y el eje horizontal despliega las columnas de cada médico o consultorio activo ese día, permitiendo comparar agendas en paralelo.
- **Código de Colores por Estado de Atención:** los bloques de citas cambian visualmente según el flujo del paciente en la clínica:
  - **Verde:** paciente en sala de espera (ya llegó).
  - **Azul:** en consulta con el médico.
  - **Gris:** turno finalizado.
  - **Naranja:** ausente o retrasado.
- **Indicadores de Sobreturnos y Urgencias:** ranuras visuales más delgadas o resaltadas en rojo que se pueden insertar entre citas estándar para casos prioritarios.
- **Barra de Progreso del Día:** línea de tiempo roja horizontal que se desplaza en tiempo real sobre el calendario para identificar retrasos acumulados en las consultas del día.

## Pantallas de Mantenimiento (Editar y Mantener)

Crucial para resolver la alta tasa de cancelaciones, cambios de horario o
ausencias inesperadas de profesionales.

- **Ventana de Reasignación en Bloque:** si un médico cancela su jornada por fuerza mayor, esta pantalla permite seleccionar todos sus turnos del día y moverlos masivamente a la agenda de otro profesional disponible o enviarlos a una *lista de espera de reprogramación*.
- **Módulo de Gestión de Plantillas Horarias:** pantalla secundaria donde cada especialista configura sus horarios fijos, bloques de almuerzo, días de vacaciones y la duración estándar de su consulta (ej. 15, 20 o 30 minutos).
- **Control de Cancelaciones con Motivo:** menú desplegable obligatorio al eliminar un turno ("Inasistencia", "Aviso del paciente", "Problema médico") conectado a notificaciones automáticas vía WhatsApp o correo electrónico para liberar la vacante de inmediato.

---

## Recomendaciones técnicas (ecosistema OpenCode)

### Frontend (React)

- **Librería base de calendario:** [FullCalendar React](https://fullcalendar.io/docs/react) o React Big Calendar — ambas manejan nativamente la vista de *Línea de tiempo de recursos* (múltiples médicos en paralelo).
- **Gestión de estado:** React Query (TanStack Query) — caché automático y actualización en tiempo real cuando un turno es asignado o modificado.
- **Componentes de UI:** la lógica del calendario con Shadcn UI o MUI (Material UI) para los formularios modales y tarjetas laterales.

### Backend (.NET C#)

- **Arquitectura de endpoints:** un controlador dedicado `AgendaController` con rutas optimizadas para alta concurrencia.
- **Validación de choques horarios:** antes de guardar usar LINQ para asegurar que MedicoId y el ConsultorioId no tengan solapamientos (`Start < NewEnd && End > NewStart`).
- **Manejo de concurrencia diferida:** para el *Blocode Preventivo de 5 minutos*, usar `MemoryCache` en .NET o un sistema ligero de colas como Hangfire para expirar el bloqueo si el operador no completa la asignación.

### Base de datos (Supabase / PostgreSQL)

- **Realtime Tables:** suscripciones en tiempo real en la tabla de turnos para que una asignación se refleje al instante, sin recargar la página.
- **Estructura sugerida:** `profesionales`, `disponibilidades`, `turnos`.
- **Tipos nativos:** `tsrange` guarda inicio/fin y el operador `&&` detecta colisiones directamente en la BD.