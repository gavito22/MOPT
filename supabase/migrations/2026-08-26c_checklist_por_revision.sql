-- Cada revisión (Primera/Segunda/Tercera) tiene su propio check list, en vez de uno
-- solo compartido por toda la vivienda.
-- Ejecutar una sola vez en el SQL Editor de Supabase, después de las migraciones anteriores.

alter table vivienda_checklist
  add column if not exists numero_revision integer not null default 1
  check (numero_revision in (1, 2, 3));

create index if not exists vivienda_checklist_revision_idx
  on vivienda_checklist (vivienda_id, numero_revision);
