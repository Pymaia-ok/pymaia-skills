

# Plan: Creador de Skills con Chat Conversacional + IA

## Resumen

Reemplazar el formulario actual de `/publicar` con una experiencia conversacional donde la IA entrevista al usuario para extraer su expertise, genera una skill estructurada, la evalúa con un score de calidad, y permite publicarla en el marketplace existente.

## Flujo del usuario

```text
/crear-skill
  ┌─────────────────────────────────────────┐
  │  1. CHAT (Skill Interviewer)            │
  │     IA pregunta sobre expertise,        │
  │     triggers, casos edge, ejemplos      │
  │     El usuario responde en natural      │
  │     (máx ~8 preguntas)                  │
  │                                         │
  │  [Botón: "Generar mi Skill"]            │
  └──────────────┬──────────────────────────┘
                 ▼
  ┌─────────────────────────────────────────┐
  │  2. PREVIEW + SCORE                     │
  │     Vista amigable de la skill:         │
  │     - Nombre, descripción, triggers     │
  │     - Ejemplos input/output             │
  │     - Score de calidad (1-10)           │
  │     - Feedback de mejora                │
  │     - Edición en lenguaje natural       │
  │                                         │
  │  [Botón: "Publicar"] [Botón: "Mejorar"] │
  └──────────────┬──────────────────────────┘
                 ▼
  ┌─────────────────────────────────────────┐
  │  3. CONFIGURACIÓN DE PUBLICACIÓN        │
  │     Categoría, industria, roles target  │
  │     (pre-llenado por la IA)             │
  │                                         │
  │  [Publicar en marketplace]              │
  └─────────────────────────────────────────┘
```

## Componentes técnicos

### 1. Base de datos — Nueva tabla `skill_drafts`

Almacena el borrador de la skill mientras el usuario la crea, incluyendo el historial del chat y el SKILL.md generado.

```sql
CREATE TABLE public.skill_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation jsonb NOT NULL DEFAULT '[]',
  generated_skill jsonb DEFAULT NULL,
  quality_score numeric DEFAULT NULL,
  quality_feedback text DEFAULT NULL,
  status text NOT NULL DEFAULT 'interviewing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_drafts ENABLE ROW LEVEL SECURITY;

-- RLS: Users only see/edit their own drafts
CREATE POLICY "Users can manage own drafts" ON public.skill_drafts
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2. Edge Function — `skill-interviewer`

Chat conversacional con streaming. Usa Lovable AI (`google/gemini-2.5-flash`) con un system prompt especializado que:
- Actúa como consultor que ayuda a empaquetar expertise
- Hace preguntas inteligentes según el dominio (máx 8)
- Extrae: triggers, instrucciones, casos edge, ejemplos, qué NO hacer
- Tono cálido y profesional, en español

### 3. Edge Function — `generate-skill`

Recibe la conversación completa y genera:
- Skill estructurada (JSON con nombre, descripción, triggers, instrucciones, ejemplos)
- Score de calidad (1-10) usando un segundo prompt como "juez"
- Feedback específico de mejora
- Metadatos sugeridos (categoría, industria, roles)

Usa `google/gemini-2.5-pro` para mayor calidad en la generación.

### 4. Páginas y componentes nuevos

- **`/crear-skill`** — Página principal del creador (reemplaza `/publicar`)
- **`SkillChat.tsx`** — Interfaz de chat con streaming, estilo conversacional
- **`SkillPreview.tsx`** — Vista amigable de la skill generada (no muestra SKILL.md crudo)
- **`SkillScoreCard.tsx`** — Score visual con feedback
- **`SkillPublishConfig.tsx`** — Formulario de metadatos pre-llenado para publicar

### 5. Integración con marketplace existente

Al publicar, se inserta en la tabla `skills` existente con `status: 'pending'` (pasa por aprobación admin como ya funciona). El `install_command` se genera automáticamente basado en el SKILL.md.

### 6. Ruta y navegación

- Nueva ruta `/crear-skill` en App.tsx
- Actualizar links en Navbar y landing que apuntan a `/publicar`
- Mantener `/publicar` como redirect a `/crear-skill`

## Configuración necesaria

- `LOVABLE_API_KEY` ya existe como secret (confirmado)
- `verify_jwt = false` en config.toml para ambas edge functions (validación en código)
- No se necesitan secrets adicionales

