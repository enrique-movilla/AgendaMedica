## Purpose

Permite a cada operador filtrar la agenda por estado de cita y conservar su
selección entre recargas y cambios de perfil, sin reconfigurarla cada vez.

## ADDED Requirements

### Requirement: Filtrar agenda por estado

La agenda SHALL mostrar solo las citas cuyo estado esté incluido en el
conjunto de estados activos elegido por el operador, en todas las vistas
(diario, semanal, mensual y lista).

#### Scenario: Operador oculta un estado

- **WHEN** el operador desactiva el estado "Cancelada"
- **THEN** las citas canceladas desaparecen de la vista actual sin recargar
  datos del servidor

#### Scenario: Operador restaura todos los estados

- **WHEN** el operador pulsa "Todos"
- **THEN** la vista vuelve a mostrar las citas de todos los estados

### Requirement: Persistir filtros por perfil de operador

El sistema SHALL conservar el conjunto de estados activos de cada perfil de
operador (`u1`, `u2`) en el navegador, de modo que sobreviva a recargas y a
cambios de perfil.

#### Scenario: Recarga conserva filtros

- **WHEN** el operador desactiva uno o más estados y recarga la página
- **THEN** la agenda se abre con exactamente esos estados activos

#### Scenario: Perfiles independientes

- **WHEN** el Usuario 1 tiene activos solo "Programada" y "Confirmada", y se
  cambia al Usuario 2
- **THEN** el Usuario 2 ve sus propios filtros (todos los estados la primera
  vez), sin afectar los del Usuario 1

#### Scenario: Sin guardado previo

- **WHEN** el perfil activo nunca guardó filtros
- **THEN** la agenda muestra todos los estados (comportamiento actual sin
  cambios)
