

## Plan: Playground de prueba interactiva de Skills

Agregar un paso de "Probar skill" en el flujo de creación, entre la preview y la publicación, donde el usuario puede chatear con su skill en tiempo real para validar que funcione como espera.

### Cómo funciona

1. **Nuevo botón "Probar mi skill"** en `SkillPreview.tsx` — abre un playground inline
2. **Componente `SkillPlayground.tsx`** — chat embebido donde el usuario escribe inputs y la IA responde simulando ser Claude con esa skill activa
3. **Edge Function `test-skill-playground`** — recibe el `instructions` + `triggers` + `dont_do` de la skill como system prompt, y el mensaje del usuario. Responde en streaming como si fuera Claude ejecutando la skill
4. **Flujo refinamiento**: desde el playground el usuario puede volver a la preview para refinar y re-probar

### Flujo del usuario

```text
Chat entrevista → Preview + Score → 🆕 Playground (probar) → Publish
                       ↑__________________________|
                       (refinar y volver a probar)
```

### Cambios

- **Crear** `src/components/crear-skill/SkillPlayground.tsx` — interfaz de chat minimalista con el system prompt de la skill, input fijo abajo, mensajes con bubbles
- **Crear** `supabase/functions/test-skill-playground/index.ts` — toma `skill.instructions`, `skill.triggers`, `skill.dont_do`, `skill.examples` como system prompt y hace streaming de respuesta vía Lovable AI gateway
- **Editar** `src/components/crear-skill/SkillPreview.tsx` — agregar botón "Probar mi skill" que alterna entre preview y playground
- **Editar** `src/pages/CrearSkill.tsx` — agregar estado `playground` como paso opcional dentro de preview

### Detalle del playground

- System prompt construido dinámicamente: "Sos un asistente que sigue estas instrucciones: {skill.instructions}. Triggers: {triggers}. No hagas: {dont_do}."
- Streaming de respuesta igual que el chat de entrevista
- Botón flotante para volver a la preview con opción de refinar
- Indicador visual claro de que estás "probando" la skill (badge/banner)

