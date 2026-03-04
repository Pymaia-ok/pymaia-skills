

## Plan: Bigramas para skillsmp.com + Firecrawl crawl para skills.sh/claude-plugins.dev

### Problema actual
- **skillsmp.com**: Buscar por letra individual ("a") devuelve ~50 resultados. Con bigramas ("aa", "ab"...) se cubriria mucho mas del espacio de 364K skills.
- **skills.sh / claude-plugins.dev**: Firecrawl `map` tiene un techo duro de ~4,500 URLs sin importar el parametro `search`. El metodo `crawl` permite rastreo recursivo sin ese limite.

### Cambios en `supabase/functions/sync-skills/index.ts`

#### 1. skillsmp.com — Soporte para bigramas
- Aceptar `letter` de 1 o 2+ caracteres (ej: "a", "ab", "python", "react")
- No cambia la logica interna, solo se usa el `letter` como query `q=`
- Esto permite invocar con `{"source":"skillsmp","letter":"ab"}` para cubrir bigramas

#### 2. skills.sh — Cambiar de `map` a `crawl`
- Reemplazar `POST /v1/map` por `POST /v1/crawl` con:
  - `limit: 1000` (pages por invocacion, ajustable)
  - `includePaths: ["/*/*/*"]` para filtrar solo URLs de skills (owner/repo/name)
  - `scrapeOptions: { formats: ["links"] }` para minimizar datos transferidos
- Parsear los URLs de las paginas crawleadas para extraer owner/repo/name
- El crawl es asincrono: hace `POST /v1/crawl` → recibe `id` → poll `GET /v1/crawl/{id}` hasta completar

#### 3. claude-plugins.dev — Igual que skills.sh, crawl en vez de map
- `POST /v1/crawl` sobre `https://claude-plugins.dev/skills`
- `includePaths: ["/skills/@*"]` para filtrar URLs de skills
- Parsear URLs para extraer owner/repo/name

#### 4. Nuevo source "skillsmp-bigrams"
- Acepta un parametro `prefix` (ej: "a") y genera automaticamente los 26 bigramas: "aa", "ab"..."az"
- Ejecuta `fetchSkillsMP` para cada bigrama secuencialmente
- Permite cubrir un bloque completo con una sola invocacion: `{"source":"skillsmp-bigrams","letter":"a"}` ejecuta aa-az

### Flujo de ejecucion esperado

```text
# skillsmp.com bigramas (cada invocacion = 26 queries)
POST /sync-skills {"source":"skillsmp-bigrams","letter":"a"}  → aa,ab,...az
POST /sync-skills {"source":"skillsmp-bigrams","letter":"b"}  → ba,bb,...bz
...

# Firecrawl crawl (cada invocacion = 1 crawl asincrono)
POST /sync-skills {"source":"skillssh-crawl","letter":"a"}
POST /sync-skills {"source":"claudeplugins-crawl","letter":"a"}
```

### Archivo a modificar
- `supabase/functions/sync-skills/index.ts`

