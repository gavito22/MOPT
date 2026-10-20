-- Agrega un estado "Rechazado" (distinto de "Rechazado (Nera revisión)"): se activa con
-- el botón "Rechazado" en cualquiera de las 3 revisiones y marca el proyecto como
-- completamente rechazado, sin importar en qué revisión estaba.
-- Ejecutar una sola vez en el SQL Editor de Supabase, después de las migraciones anteriores.

alter table viviendas add column if not exists rechazo_definitivo boolean not null default false;

drop index if exists viviendas_estado_idx;
alter table viviendas drop column if exists estado;
alter table viviendas add column estado text generated always as (
  case
    when rechazo_definitivo then 'Rechazado'
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
