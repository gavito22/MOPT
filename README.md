# MOPT — Revisión de Viviendas Unifamiliares

Aplicación web (Vue 3 + TypeScript + Vite + Supabase) para gestionar la revisión de proyectos de
accesos vehiculares para vivienda unifamiliar: carga masiva de datos crudos del sistema APC,
formulario de revisión por proyecto (Datos del APC, Ubicación con mapa, Check list, Revisiones en
hasta dos ingresos), ficha individual exportable y compendio final en Excel.

## Puesta en marcha

1. **Instalar dependencias**

   ```
   npm install
   ```

2. **Variables de entorno**: copiar `.env.example` a `.env.local` y completar con el Project URL y
   la anon public key del proyecto de Supabase.

3. **Base de datos**: en el SQL Editor del proyecto de Supabase, ejecutar en orden:
   - `supabase/schema.sql` (tablas, columna `estado` generada, políticas RLS, buckets de Storage)
   - `supabase/seed.sql` (catálogo de Provincia/Cantón/Distrito y Regionales)

   `supabase/seed.sql` se genera automáticamente a partir de `ProvinciaCantonDistrito.xlsx` y la
   hoja `Regional` de `Proyectos Copilado.xlsx`. Si esos archivos cambian, regenerarlo con:

   ```
   node scripts/generar-seed.mjs
   ```

4. **Usuarios**: dado que el sistema usa un solo rol (cualquier autenticado tiene acceso completo),
   las cuentas del equipo se crean una vez desde **Authentication → Users** en el dashboard de
   Supabase (correo + contraseña). No hay auto-registro desde la aplicación.

5. **Desarrollo local**

   ```
   npm run dev
   ```

6. **Build de producción**

   ```
   npm run build
   ```

## Estructura

- `src/pages/` — una vista por ruta (Viviendas, formulario de vivienda, Configuración, Login).
- `src/components/` — `Layout.vue` (sidebar + shell), `ConfirmModal.vue`, y `components/vivienda/`
  con las 4 pestañas del formulario.
- `src/lib/` — `supabase.ts` (cliente), `api.ts` (todas las consultas/mutaciones), `excelExport.ts`
  (carga masiva, compendio y ficha), `useCurrentUser.ts`, `database.types.ts`.
- `supabase/` — esquema SQL y semillas de catálogos.
