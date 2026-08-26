-- Deja "Observaciones" y "Permiso de ejecución y funcionamiento" (+ su fecha) como campos
-- únicos de la vivienda (ya no uno por cada revisión), elimina "Oficio o informe de
-- regional"/"Fecha informe", y quita la obligatoriedad de "etapa" en los adjuntos (ahora
-- se suben en un solo lugar, no por revisión).
-- Ejecutar una sola vez en el SQL Editor de Supabase, después de las migraciones anteriores.

-- 1) Columnas únicas nuevas.
alter table viviendas
  add column if not exists permiso_ejecucion_funcionamiento text,
  add column if not exists fecha_permiso_ejecucion_funcionamiento date,
  add column if not exists observaciones text;

-- 2) Migrar el valor de la revisión vigente (la más reciente con resolución) a las
--    columnas nuevas, para no perder datos ya capturados.
update viviendas set
  permiso_ejecucion_funcionamiento = coalesce(
    tercera_oficio_permiso_funcionamiento,
    segunda_oficio_permiso_funcionamiento,
    primera_oficio_permiso_funcionamiento
  ),
  fecha_permiso_ejecucion_funcionamiento = coalesce(
    tercera_fecha_permiso_funcionamiento,
    segunda_fecha_permiso_funcionamiento,
    primera_fecha_permiso_funcionamiento
  ),
  observaciones = coalesce(tercera_observaciones, segunda_observaciones, primera_observaciones);

-- 3) Quitar las columnas viejas (por revisión) que ya quedaron reemplazadas.
alter table viviendas
  drop column if exists primera_observaciones,
  drop column if exists primera_oficio_informe_regional,
  drop column if exists primera_fecha_informe,
  drop column if exists primera_oficio_permiso_funcionamiento,
  drop column if exists primera_fecha_permiso_funcionamiento,
  drop column if exists segunda_observaciones,
  drop column if exists segunda_oficio_informe_regional,
  drop column if exists segunda_fecha_informe,
  drop column if exists segunda_oficio_permiso_funcionamiento,
  drop column if exists segunda_fecha_permiso_funcionamiento,
  drop column if exists tercera_observaciones,
  drop column if exists tercera_oficio_informe_regional,
  drop column if exists tercera_fecha_informe,
  drop column if exists tercera_oficio_permiso_funcionamiento,
  drop column if exists tercera_fecha_permiso_funcionamiento;

-- 4) Adjuntos: ya no se suben por revisión, sino en un solo lugar por vivienda.
alter table vivienda_adjuntos drop constraint if exists vivienda_adjuntos_etapa_check;
alter table vivienda_adjuntos alter column etapa drop not null;
