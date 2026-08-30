# Design System Master: Marca y UI/UX

## 1. Identidad de Marca y Mensaje Comercial
* **Nombre de la Aplicación:** Sincora
* **Lema Principal:** Recursos, tiempo y reservas en sincronía.
* **Descripción Breve:** Plataforma para administrar disponibilidad y asignar recursos.
* **Mensaje Comercial:** Convierte disponibilidad en operaciones organizadas.
* **Llamado a la Acción (CTA Principal):** Organiza tus recursos.
* **Alternativa de CTA:** Empieza a sincronizar tu operación.

### Textos de Copiloto y Canales
* **Descripción para Página Web:** Sincora es la plataforma que centraliza la disponibilidad de tu equipo, espacios y equipos para que puedas gestionar reservas, asignaciones y atención sin conflictos de horario.
* **Perfil Social (Breve):** Gestiona recursos, tiempo y reservas en un solo lugar.
* **Perfil B2B (Corporativo):** `Sincora` ayuda a negocios de servicios y operaciones a administrar la disponibilidad de personas, espacios y activos desde una única plataforma configurable.

---

## 2. Convenciones Lingüísticas del Sistema (UI Lexicon)
*Nota: El concepto técnico universal es "**Recurso**". La interfaz debe construirse bajo estas equivalencias heredadas:*

| Término Técnico / Anterior | Equivalencia Recomendada en Interfaz |
| :--- | :--- |
| Agenda Médica | **Sincora** |
| Gestión de citas | Recursos y disponibilidad |
| Agenda | Disponibilidad |
| Agenda del día | Operación de hoy |
| Nueva cita | Nueva asignación |
| Pacientes | Clientes |
| Profesionales | Recursos |
| Gestión de disponibilidad | Disponibilidad y horarios |
| Catálogos | Servicios y categorías |
| Calendario de citas por profesional | Calendario de reservas por recurso |
| Seleccione los médicos a mostrar | Selecciona los recursos que deseas visualizar |
| Próximo turno disponible | Próxima disponibilidad |
| Seleccione una cita para ver su detalle... | Selecciona una reserva para consultar sus detalles, historial y acciones |

---

## 3. Identidad Visual y Estilo de Componentes
* **Forma:** Dos módulos curvos, geométricos y redondeados.
* **Estética:** Limpia, tecnológica, accesible y B2B.
* **Sensación:** Sincronía, movimiento, orden y confianza.
* **Tipografía:** Sans-serif moderna, de grosor medio o semibold (priorizar familias limpias como *Inter* o *Montserrat*).
* **Restricciones de Diseño (Anti-patterns a Evitar):** Cruces, calendarios tradicionales, estetoscopios, relojes clásicos y siluetas médicas. El isotipo debe ser legible y nítido a escalas mínimas de `24x24 px`.

---

## 4. Paleta de Colores de Interfaz (Design Tokens)
*Sobrescribir cualquier token por defecto del skill con los siguientes valores hexadecimales:*

```json
{
  "brand": {
    "primary": "#075E78",
    "action": "#087FA3",
    "secondary": "#14B8B0",
    "background_light": "#F2FBFA",
    "text_dark": "#153B47",
    "status_success": "#18A86B"
  }
}
```

---

## 5. Instrucción de Acoplamiento con Skill `ui-ux-pro-max`
Al generar interfaces, layouts de Tailwind, componentes de React/Vue o flujos de experiencia de usuario:
1. Aplica los principios de accesibilidad (contraste mínimo 4.5:1), layouts elásticos para texto compacto y animaciones cancelables dictados por la base de conocimientos de `ui-ux-pro-max`.
2. Sobrescribe la paleta de colores por defecto y la terminología genérica del skill usando estrictamente este documento como la **Única Fuente de Verdad** corporativa.
