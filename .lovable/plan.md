

## Problem

The system prompt tells the interviewer to do "máximo 8 preguntas" and at the end it says farewell ("te contactaré pronto") instead of signaling the conversation is done. Meanwhile, the "Generar mi Skill" button only appears after 5 user messages — so the user has to manually notice and click it. The AI should either auto-trigger generation or clearly prompt the user to click the button.

## Solution

Two changes:

### 1. Update the system prompt to NOT say goodbye
In `supabase/functions/skill-interviewer/index.ts`, add a rule to the system prompt:

> "Cuando tengas suficiente información (después de ~6-8 preguntas), terminá tu último mensaje con la frase exacta `[ENTREVISTA_COMPLETA]` en una línea nueva. NO digas que vas a procesar nada ni que te vas a contactar después. Simplemente resumí brevemente lo que entendiste y agregá el marcador."

### 2. Auto-trigger generation when interview is complete
In `src/components/crear-skill/SkillChat.tsx`:

- Detect when the last assistant message contains `[ENTREVISTA_COMPLETA]`
- Automatically call `onGenerate()` when this marker is detected (with a small delay for UX)
- Strip the `[ENTREVISTA_COMPLETA]` marker from the displayed message so the user doesn't see it
- This makes the flow seamless: interview ends → skill generation starts automatically

### Files to modify
1. `supabase/functions/skill-interviewer/index.ts` — update system prompt rules
2. `src/components/crear-skill/SkillChat.tsx` — add auto-trigger logic via `useEffect` watching messages

