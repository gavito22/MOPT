-- MOPT — Revisión de Viviendas Unifamiliares
-- Ejecutar una sola vez en el SQL Editor de Supabase (proyecto ya existente).

create extension if not exists pgcrypto;

-- ---------- datos_crudos ----------
create table if not exists datos_crudos (
  id uuid primary key default gen_random_uuid(),
  fase_revision text,
  subproyecto text,
  descripcion_proyecto text,
  area_tasada numeric,
  codigo_cfia text,
  codigo_apc text not null unique,
  dias_decreto integer,
  fecha_inicio date,
  fecha_vencimiento date,
  propietario text,
  carnet text,
  valor_total numeric,
  remodelacion text,
  ampliacion text,
  coordenadas_raw text,
  catastro text,
  importado_en timestamptz not null default now(),
  procesado boolean not null default false
);

-- ---------- catálogos ----------
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden integer not null default 0,
  activo boolean not null default true
);

create table if not exists regionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden integer not null default 0,
  activo boolean not null default true
);

create table if not exists ubicaciones_cr (
  id uuid primary key default gen_random_uuid(),
  provincia text not null,
  canton text not null,
  distrito text not null
);
create index if not exists ubicaciones_cr_provincia_idx on ubicaciones_cr (provincia);
create index if not exists ubicaciones_cr_canton_idx on ubicaciones_cr (provincia, canton);

-- ---------- viviendas ----------
create table if not exists viviendas (
  id uuid primary key default gen_random_uuid(),

  -- Datos del APC
  codigo_cfia text,
  codigo_apc text,
  nombre_proyecto text,
  dias_decreto integer,
  fecha_inicio date,
  fecha_vencimiento date,
  propietario text,
  coordenadas_raw text,
  catastro text,
  datos_crudos_id uuid references datos_crudos (id),

  -- Ubicación
  lat double precision,
  lng double precision,
  provincia text,
  canton text,
  distrito text,
  ruta_nacional integer,
  velocidad integer,
  regional_id uuid references regionales (id),
  mapa_imagen_url text,

  -- Flujo
  tipo_ingreso text,

  -- Primera revisión
  primera_resolucion text check (primera_resolucion in ('Aprobado', 'Rechazado')),
  primera_observaciones text,
  primera_oficio_informe_regional text,
  primera_fecha_informe date,
  primera_oficio_permiso_funcionamiento text,
  primera_fecha_permiso_funcionamiento date,
  primera_revisado_por text,
  primera_fecha timestamptz,

  -- Segunda revisión (se habilita si la primera fue Rechazado)
  segunda_resolucion text check (segunda_resolucion in ('Aprobado', 'Rechazado')),
  segunda_observaciones text,
  segunda_fecha_inicio date,
  segunda_fecha_vencimiento date,
  segunda_oficio_informe_regional text,
  segunda_fecha_informe date,
  segunda_oficio_permiso_funcionamiento text,
  segunda_fecha_permiso_funcionamiento date,
  segunda_revisado_por text,
  segunda_fecha timestamptz,

  -- Tercera revisión (se habilita si la segunda fue Rechazado)
  tercera_resolucion text check (tercera_resolucion in ('Aprobado', 'Rechazado')),
  tercera_observaciones text,
  tercera_fecha_inicio date,
  tercera_fecha_vencimiento date,
  tercera_oficio_informe_regional text,
  tercera_fecha_informe date,
  tercera_oficio_permiso_funcionamiento text,
  tercera_fecha_permiso_funcionamiento date,
  tercera_revisado_por text,
  tercera_fecha timestamptz,

  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),

  estado text generated always as (
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
  ) stored
);
create index if not exists viviendas_estado_idx on viviendas (estado);
create index if not exists viviendas_created_at_idx on viviendas (created_at);

create table if not exists vivienda_checklist (
  id uuid primary key default gen_random_uuid(),
  vivienda_id uuid not null references viviendas (id) on delete cascade,
  checklist_item_id uuid not null references checklist_items (id),
  estado text check (estado in ('Cumple', 'No cumple')),
  observacion text
);
create index if not exists vivienda_checklist_vivienda_idx on vivienda_checklist (vivienda_id);

create table if not exists vivienda_adjuntos (
  id uuid primary key default gen_random_uuid(),
  vivienda_id uuid not null references viviendas (id) on delete cascade,
  etapa text not null check (etapa in ('Primera revisión', 'Segunda revisión', 'Tercera revisión')),
  nombre_archivo text not null,
  storage_path text not null,
  tipo_mime text,
  tamano_bytes bigint,
  subido_por text,
  subido_en timestamptz not null default now()
);
create index if not exists vivienda_adjuntos_vivienda_idx on vivienda_adjuntos (vivienda_id);

-- ---------- RLS: un solo rol, cualquier usuario autenticado tiene acceso total ----------
alter table datos_crudos enable row level security;
alter table viviendas enable row level security;
alter table checklist_items enable row level security;
alter table vivienda_checklist enable row level security;
alter table regionales enable row level security;
alter table ubicaciones_cr enable row level security;
alter table vivienda_adjuntos enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'datos_crudos', 'viviendas', 'checklist_items', 'vivienda_checklist',
    'regionales', 'ubicaciones_cr', 'vivienda_adjuntos'
  ])
  loop
    execute format('drop policy if exists "authenticated_all" on %I', t);
    execute format(
      'create policy "authenticated_all" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('mapas', 'mapas', true), ('adjuntos', 'adjuntos', true)
on conflict (id) do nothing;

drop policy if exists "mapas_read_public" on storage.objects;
create policy "mapas_read_public" on storage.objects
  for select to public using (bucket_id = 'mapas');
drop policy if exists "mapas_write_authenticated" on storage.objects;
create policy "mapas_write_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'mapas');
drop policy if exists "mapas_update_authenticated" on storage.objects;
create policy "mapas_update_authenticated" on storage.objects
  for update to authenticated using (bucket_id = 'mapas');
drop policy if exists "mapas_delete_authenticated" on storage.objects;
create policy "mapas_delete_authenticated" on storage.objects
  for delete to authenticated using (bucket_id = 'mapas');

drop policy if exists "adjuntos_read_public" on storage.objects;
create policy "adjuntos_read_public" on storage.objects
  for select to public using (bucket_id = 'adjuntos');
drop policy if exists "adjuntos_write_authenticated" on storage.objects;
create policy "adjuntos_write_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'adjuntos');
drop policy if exists "adjuntos_delete_authenticated" on storage.objects;
create policy "adjuntos_delete_authenticated" on storage.objects
  for delete to authenticated using (bucket_id = 'adjuntos');

-- ---------- Semillas fijas (checklist e datos base) ----------
insert into checklist_items (nombre, orden) values
  ('Ubicación', 1),
  ('Ruta', 2),
  ('Plano catastrado', 3),
  ('Velocidad', 4),
  ('Alineamiento', 5),
  ('Declaración', 6),
  ('Diseños', 7),
  ('Otros', 8)
on conflict do nothing;
