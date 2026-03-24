

## Auditoría de Seguridad para Repositorio Público

### Resultado: **SEGURO con 2 observaciones menores**

El repositorio está en buenas condiciones para hacerse público. Todos los secretos sensibles están protegidos.

---

### Lo que está BIEN protegido

| Elemento | Estado |
|----------|--------|
| `.env` | Excluido en `.gitignore` — nunca se commitea |
| `.lovable/` | Excluido en `.gitignore` — PRDs internos no se publican |
| 8 secrets runtime (ADMIN_FUNCTION_SECRET, GITHUB_TOKEN, RESEND_API_KEY, etc.) | Solo en el vault de Lovable Cloud, no en código |
| Edge functions | Usan `Deno.env.get()` — leen secrets del runtime, no los hardcodean |
| Archivos `.pem`, `.key` | Excluidos en `.gitignore` |
| No hay passwords ni API keys hardcodeadas | Confirmado en todo el frontend |

### Observaciones (riesgo BAJO, no bloqueantes)

**1. Anon key hardcodeada en `vite.config.ts`**
- La anon key (`eyJhbG...`) está como fallback en `vite.config.ts`
- **Riesgo**: BAJO. La anon key es **pública por diseño** — es la clave que va al browser. Está protegida por RLS policies
- **Acción**: Ninguna requerida, pero si preferís limpieza, se puede reemplazar por un placeholder que falle con mensaje claro

**2. Anon key + project URL en migrations SQL**
- Los archivos en `supabase/migrations/` contienen la anon key en headers de cron jobs (`pg_net` calls)
- **Riesgo**: BAJO. Son migrations que configuran crons server-side. La anon key es pública y los crons corren dentro de la infraestructura de Lovable Cloud
- **Acción**: Ninguna requerida — es el patrón estándar de pg_cron + pg_net

**3. Project ID en `openapi.json` y `vite.config.ts`**
- El project ID `zugqvdqactbhzlilwyds` aparece en URLs públicas
- **Riesgo**: NINGUNO. Es un identificador público, no un secreto

### Conclusión

El repo es **seguro para publicar**. No hay secretos privados expuestos. La anon key que aparece es pública por diseño (equivalente a una URL de API pública). Todos los secretos sensibles (service role key, GitHub token, API keys) están exclusivamente en el vault runtime.

