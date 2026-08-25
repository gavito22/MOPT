-- Unifica los campos de las 3 revisiones y agrega la Tercera revisión.
-- Ejecutar una sola vez en el SQL Editor de Supabase, DESPUÉS de
-- 2026-08-25_simplificar_datos_apc.sql.

-- 1) Quitar columnas exclusivas de la segunda revisión que ya no se usan.
alter table viviendas
  drop column if exists segunda_permiso_ejecucion,
  drop column if exists segunda_fecha_permiso_ejecucion,
  drop column if exists segunda_enviado_por,
  drop column if exists segunda_regional_id;

-- 2) Renombrar el campo de oficio para que coincida con el nuevo nombre común.
alter table viviendas rename column segunda_numero_oficio to segunda_oficio_informe_regional;

-- 3) Agregar a la primera revisión los mismos 4 campos "de aprobación" que ya tenía la segunda.
alter table viviendas
  add column if not exists primera_oficio_informe_regional text,
  add column if not exists primera_fecha_informe date,
  add column if not exists primera_oficio_permiso_funcionamiento text,
  add column if not exists primera_fecha_permiso_funcionamiento date;

-- 4) Agregar la tercera revisión completa (mismos 8 campos que primera/segunda).
alter table viviendas
  add column if not exists tercera_resolucion text check (tercera_resolucion in ('Aprobado', 'Rechazado')),
  add column if not exists tercera_observaciones text,
  add column if not exists tercera_oficio_informe_regional text,
  add column if not exists tercera_fecha_informe date,
  add column if not exists tercera_oficio_permiso_funcionamiento text,
  add column if not exists tercera_fecha_permiso_funcionamiento date,
  add column if not exists tercera_revisado_por text,
  add column if not exists tercera_fecha timestamptz;

-- 5) Recalcular la columna generada "estado" con la lógica de 3 revisiones.
drop index if exists viviendas_estado_idx;
alter table viviendas drop column if exists estado;
alter table viviendas add column estado text generated always as (
  case
    when primera_resolucion is null then 'Pendiente'
    when primera_resolucion = 'Aprobado' then 'Aprobado (1ra revisión)'
    when primera_resolucion = 'Rechazado' and segunda_resolucion is null then 'Pendiente 2da revisión'
    when segunda_resolucion = 'Aprobado' then 'Aprobado (2da revisión)'
    when segunda_resolucion = 'Rechazado' and tercera_resolucion is null then 'Pendiente 3ra revisión'
    when tercera_resolucion = 'Aprobado' then 'Aprobado (3ra revisión)'
    when tercera_resolucion = 'Rechazado' then 'Rechazado'
    else 'Pendiente'
  end
) stored;
create index viviendas_estado_idx on viviendas (estado);

-- 6) Permitir 'Tercera revisión' como etapa de adjuntos.
alter table vivienda_adjuntos drop constraint if exists vivienda_adjuntos_etapa_check;
alter table vivienda_adjuntos
  add constraint vivienda_adjuntos_etapa_check
  check (etapa in ('Primera revisión', 'Segunda revisión', 'Tercera revisión'));
