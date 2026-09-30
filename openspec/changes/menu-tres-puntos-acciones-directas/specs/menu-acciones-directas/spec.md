# Spec Delta

## Purpose

Permite al operador ejecutar las acciones principales de una cita
directamente desde el menú de 3 puntos de la timeline diaria, sin abrir
primero el panel de detalle.

## ADDED Requirements

### Requirement: Acciones directas del menú por bloque

El menú de 3 puntos de cada bloque de cita en la timeline diaria SHALL
ofrecer Ver detalle, Reprogramar, Duplicar y Cancelar, mostrando cada
acción solo cuando el estado de la cita la permite.

#### Scenario: Operador reprograma desde el menú

- **WHEN** el operador elige Reprogramar en una cita en estado
  programada/confirmada/reprogramada e indica nueva fecha y hora
- **THEN** la cita se reprograma con las mismas validaciones que el panel
  detalle y la timeline se actualiza

#### Scenario: Operador cancela desde el menú

- **WHEN** el operador elige Cancelar en una cita cancelable y selecciona
  un motivo del catálogo
- **THEN** la cita se cancela con ese motivo y la timeline se actualiza

#### Scenario: Cancelar exige motivo

- **WHEN** el operador intenta confirmar la cancelación sin motivo
- **THEN** el sistema muestra el error y no cancela la cita

#### Scenario: Operador duplica desde el menú

- **WHEN** el operador elige Duplicar en una cita
- **THEN** se abre Nueva asignación con profesional, tipo y motivo
  precargados desde la cita origen, y el operador completa paciente y
  fecha para crearla

#### Scenario: Acción no permitida por estado

- **WHEN** la cita está en un estado que no admite reprogramación (p. ej.
  realizada)
- **THEN** el menú no muestra la opción Reprogramar para esa cita

#### Scenario: Etiqueta Duplicar configurable

- **WHEN** la identidad de la aplicación define el término de duplicar
- **THEN** el menú muestra esa etiqueta en lugar del valor por defecto
