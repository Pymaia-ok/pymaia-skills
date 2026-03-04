

## Plan: Traducir contenido de skills al idioma del usuario

Tenés razón — sería mejor que todo esté en el idioma del usuario. El contenido de las skills (`display_name`, `tagline`, `description_human`) viene de GitHub en inglés y actualmente no se traduce. Acá va el plan para solucionarlo.

### Enfoque

Agregar columnas `tagline_es` y `description_human_es` a la tabla `skills`, y usar una Edge Function que traduzca en lotes usando el modelo de IA de Lovable (Gemini Flash, sin API key). En el frontend, mostrar la versión en español cuando `i18n.language === "es"`.

### Pasos

1. **Migración de DB** — Agregar columnas `tagline_es` y `description_human_es` (nullable) a la tabla `skills`.

2. **Edge Function `translate-skills`** — Nueva función que:
   - Selecciona skills donde `tagline_es IS NULL` en lotes de 50
   - Envía `tagline` + `description_human` al modelo Gemini Flash pidiendo traducción al español
   - Actualiza las columnas `_es` con el resultado
   - Diseñada para ejecutarse múltiples veces hasta completar las ~14k skills

3. **Frontend: mostrar contenido traducido** — En `SkillCard.tsx` y `SkillDetail.tsx`:
   - Si `i18n.language === "es"` y existe `tagline_es`, mostrar `tagline_es`; si no, fallback al original
   - Mismo patrón para `description_human_es`
   - `display_name` NO se traduce (son nombres propios de herramientas)

4. **Ejecutar traducción en lotes** — Llamar la Edge Function repetidamente hasta cubrir todos los registros.

### Consideraciones
- **Costo**: Gemini Flash es económico; ~14k traducciones cortas son manejables
- **Tiempo**: En lotes de 50, serían ~280 llamadas; estimado 15-30 minutos total
- **Fallback**: Si no hay traducción disponible, se muestra el contenido original (inglés)
- **Sync futuro**: Cuando se sincronicen nuevas skills, `tagline_es` será NULL y se traducirán en la siguiente ejecución

