-- Quita de "viviendas" los campos que no se usan en el flujo de revisión.
-- Ejecutar una sola vez en el SQL Editor de Supabase (solo si ya corriste schema.sql antes de este cambio).

alter table viviendas
  drop column if exists fase_revision,
  drop column if exists subproyecto,
  drop column if exists area_tasada,
  drop column if exists carnet,
  drop column if exists valor_total,
  drop column if exists remodelacion,
  drop column if exists ampliacion;
