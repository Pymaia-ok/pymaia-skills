

# Plan: Eliminar la función `reveal-db-url`

Ahora que ya tenés el connection string, hay que borrar la función temporal para que nadie más pueda usarla.

## Cambios

1. **Eliminar** `supabase/functions/reveal-db-url/index.ts`
2. **Eliminar de `supabase/config.toml`** el bloque `[functions.reveal-db-url]`

Eso es todo. Dos archivos tocados, función eliminada del deploy.

