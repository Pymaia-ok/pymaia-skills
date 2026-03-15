

# Plan: Obtener el Database Connection String

## Situación actual

Tu proyecto ya tiene el secret `SUPABASE_DB_URL` configurado (lo veo en la lista de secrets). Este ES el connection string directo a PostgreSQL. Solo necesitamos exponerlo de forma segura para que puedas copiarlo.

## Solución: Edge function temporal para revelar la URL

Crear una edge function mínima que, autenticada como admin, devuelva el valor de `SUPABASE_DB_URL`.

### Archivo: `supabase/functions/reveal-db-url/index.ts`

- Solo responde a usuarios con rol `admin`
- Devuelve `SUPABASE_DB_URL` del entorno
- Una vez que copies la URL, podemos borrar esta función

### Actualizar: `supabase/config.toml`

- Agregar `[functions.reveal-db-url]` con `verify_jwt = false`

## Flujo

1. Deployar la función
2. Llamarla desde el navegador (logueado como admin) o con curl + tu token JWT
3. Copiar el connection string
4. Borrar la función (ya no la necesitás)

## Después

Con el connection string en mano:
- Lo guardás en `.env.local` (NO committear)
- Claude Code puede conectarse directamente a PostgreSQL con acceso completo de lectura
- No necesitás ningún proxy ni edge function intermedia

## Seguridad

- La función solo funciona para admins (verifica `has_role`)
- Se elimina después de copiar el valor
- El connection string se guarda solo localmente

