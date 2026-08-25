-- Renombra los estados y agrega Regional como campo de Ubicación (no de una revisión específica).
-- Ejecutar una sola vez en el SQL Editor de Supabase, después de las migraciones anteriores.

-- 1) Regional pasa a ser parte de la ubicación de la vivienda.
alter table viviendas add column if not exists regional_id uuid references regionales (id);

-- 2) Recalcular "estado" con las nuevas etiquetas.
drop index if exists viviendas_estado_idx;
alter table viviendas drop column if exists estado;
alter table viviendas add column estado text generated always as (
  case
    when primera_resolucion is null then 'Pendiente'
    when primera_resolucion = 'Aprobado' then 'Aprobado (1era revisión)'
    when primera_resolucion = 'Rechazado' and segunda_resolucion is null then 'Rechazado (1era revisión)'
    when segunda_resolucion = 'Aprobado' then 'Aprobado (2da revisión)'
    when segunda_resolucion = 'Rechazado' and tercera_resolucion is null then 'Rechazado (2da revisión)'
    when tercera_resolucion = 'Aprobado' then 'Aprobado (3era revisión)'
    when tercera_resolucion = 'Rechazado' then 'Rechazado (3era revisión)'
    else 'Pendiente'
  end
) stored;
create index viviendas_estado_idx on viviendas (estado);
