

## Plan: Integrar lógica best-in-class del skill-creator de Anthropic

### Hallazgos clave del análisis

Después de estudiar la spec oficial de agentskills.io y las ~15 skills de ejemplo del repo de Anthropic, identifiqué los patrones que hacen que una skill sea "best in class" y que nuestro creator no aplica:

1. **Descriptions keyword-rich**: Las buenas descriptions dicen QUE hace + CUANDO usarla con keywords que ayudan al agente a hacer matching (ej: "Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF documents...")
2. **Decision trees**: Las skills top (webapp-testing, mcp-builder) incluyen árboles de decisión en formato ASCII que guían al agente
3. **Patrón ❌/✅**: Common pitfalls con formato visual explícito (❌ Don't / ✅ Do)
4. **Código ejecutable**: Ejemplos con bloques de código reales, no solo texto descriptivo
5. **Progressive disclosure**: SKILL.md < 500 líneas, con referencias a archivos externos para detalles
6. **Secciones estructuradas**: Overview → Process/Workflow → Examples → Best Practices → Common Pitfalls → Reference Files

### Cambios a implementar

#### 1. Actualizar `GENERATE_PROMPT` en `supabase/functions/generate-skill/index.ts`

Reescribir el prompt de generación para que produzca SKILL.md con los patrones de Anthropic:
- Description: obligar formato "Qué hace. Cuándo usarla. Keywords."
- Body con secciones: Overview → Decision Tree (cuando aplica) → Step-by-step Process → Examples (con código cuando es técnica) → Best Practices → Common Pitfalls (formato ❌/✅) → What NOT to do
- Limitar a < 500 líneas
- Agregar sección de Guidelines con edge cases integrados

#### 2. Actualizar `SYSTEM_PROMPT` en `supabase/functions/skill-interviewer/index.ts`

Mejorar la entrevista para extraer la información que necesitan las mejores skills:
- Preguntar explícitamente por **decision tree**: "¿Cuándo SÍ y cuándo NO debería activarse?"
- Preguntar por **common pitfalls**: "¿Cuáles son los errores más comunes que la gente comete?"
- Preguntar por **código/output concreto**: "¿Podés darme un ejemplo real de input y exactamente qué debería producir?"
- Preguntar por **flujo paso a paso**: "¿Cuáles son los pasos exactos, en orden?"

#### 3. Actualizar `JUDGE_PROMPT` en `supabase/functions/generate-skill/index.ts`

Alinear los criterios de evaluación a los patrones de Anthropic:
- Evaluar si tiene decision tree o workflow claro
- Evaluar calidad de la description (keywords, WHAT + WHEN)
- Evaluar si tiene common pitfalls con formato ❌/✅
- Evaluar progressive disclosure (< 500 líneas, referencias cuando necesario)
- Evaluar si los ejemplos son concretos y ejecutables

#### 4. Actualizar `TEST_PROMPT` en `supabase/functions/test-skill/index.ts`

Mejorar los tests para que evalúen contra los estándares de calidad de Anthropic:
- Testear que la description sea keyword-rich y actionable
- Testear que los pitfalls sean claros
- Simular casos donde el agente necesita decidir si activar la skill o no (testing del decision tree)

### Archivos a modificar

- `supabase/functions/skill-interviewer/index.ts` -- mejorar SYSTEM_PROMPT con preguntas best-in-class
- `supabase/functions/generate-skill/index.ts` -- reescribir GENERATE_PROMPT y JUDGE_PROMPT
- `supabase/functions/test-skill/index.ts` -- mejorar TEST_PROMPT

### Sin cambios necesarios en frontend
La UI actual (SkillPreview, SkillChat, SkillPublishConfig) ya soporta bien estos cambios porque el contenido mejorado va dentro del `install_command` (SKILL.md) y los campos existentes del JSON.

