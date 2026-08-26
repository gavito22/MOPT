-- Agrega Fecha de inicio y Fecha de vencimiento propias de la Segunda y Tercera revisión.
-- La Primera revisión reutiliza las columnas existentes fecha_inicio/fecha_vencimiento
-- (antes editadas en la pestaña "Datos del APC", ahora en la pestaña "Revisiones").
-- Ejecutar una sola vez en el SQL Editor de Supabase, después de las migraciones anteriores.

alter table viviendas
  add column if not exists segunda_fecha_inicio date,
  add column if not exists segunda_fecha_vencimiento date,
  add column if not exists tercera_fecha_inicio date,
  add column if not exists tercera_fecha_vencimiento date;
