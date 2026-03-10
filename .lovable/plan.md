

## Plan: API Keys personales para acceso privado vía MCP

### Resumen
Crear una tabla `api_keys` donde los usuarios generan keys personales. El MCP server valida el header `Authorization: Bearer <key>` para identificar al usuario e incluir sus skills privadas en las búsquedas.

### 1. Migración: tabla `api_keys`

```sql
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,       -- primeros 8 chars para mostrar en UI
  label text NOT NULL DEFAULT 'default',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (key_hash)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role api_keys"
  ON public.api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

Se almacena el **hash SHA-256** de la key, nunca en texto plano. La key completa solo se muestra una vez al crearla.

Función helper para validar keys desde el MCP server:

```sql
CREATE OR REPLACE FUNCTION public.validate_api_key(_key_hash text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT user_id FROM public.api_keys
  WHERE key_hash = _key_hash AND revoked_at IS NULL
  LIMIT 1;
$$;
```

### 2. Edge function: generar/listar/revocar keys

Crear `supabase/functions/manage-api-keys/index.ts`:
- `POST /` — genera nueva key (SHA-256 hash en DB, devuelve key plana una sola vez)
- `GET /` — lista keys del usuario (prefix, label, created_at, last_used_at)
- `DELETE /:id` — revoca una key (soft delete con `revoked_at`)
- Autenticado via JWT del usuario logueado

### 3. MCP Server: validar API key

En `supabase/functions/mcp-server/index.ts`:
- Al inicio de cada request, leer `Authorization: Bearer <key>`
- Si existe, hashear la key con SHA-256 y buscar en `api_keys` via `validate_api_key` RPC
- Si válida, obtener el `user_id` y pasar como contexto a los handlers
- Actualizar `last_used_at` en background

En los tools `search_skills`, `get_skill_details`, `solve_goal`:
- Si hay `user_id` autenticado, modificar la query para incluir `OR creator_id = user_id` (skills privadas del usuario)
- Sin API key, el comportamiento no cambia (solo skills públicas)

### 4. UI: sección API Keys en MisSkills

En `src/pages/MisSkills.tsx`, agregar una sección "API Key" después de las stats:
- Botón "Generar API Key" que llama al edge function
- Modal que muestra la key generada una sola vez con botón copiar
- Lista de keys existentes (prefix `pymsk_abc1...`, label, fecha, último uso)
- Botón revocar por key
- Snippet de configuración MCP con la key

### 5. i18n

Agregar traducciones en `src/i18n/es.ts` y `src/i18n/en.ts` para las nuevas strings de la sección API Keys.

### Flujo completo
1. Usuario va a `/mis-skills` → sección "API Key" → genera key
2. Recibe `pymsk_xxxxxxxxxxxx` (se muestra una vez)
3. Configura Claude Code con header `Authorization: Bearer pymsk_xxx...`
4. MCP server valida, identifica usuario, incluye sus skills privadas en resultados

