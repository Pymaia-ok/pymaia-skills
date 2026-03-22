

# Plan: Soporte de eBooks en el Generador de Skills

## Problema
El procesador de archivos no reconoce formatos de libros electrónicos (epub, mobi, azw3, fb2, cbz). Estos archivos no se pueden seleccionar en el frontend y si se subieran, el backend los descartaría.

## Formatos a agregar
- **EPUB** — formato estándar abierto (es un ZIP con HTML/XHTML interno)
- **MOBI/AZW3** — formatos Kindle (binarios, requieren conversión)
- **FB2** — formato XML usado en Europa del Este
- **CBZ/CBR** — cómics (ZIP/RAR con imágenes)

## Cambios

### 1. Frontend — `SkillChat.tsx`
- Agregar `.epub,.mobi,.azw3,.fb2,.cbz` al atributo `accept` del file input

### 2. Backend — `process-attachment/index.ts`
- Agregar `ebookExts = ["epub", "mobi", "azw3", "fb2", "cbz"]` como nueva categoría
- **EPUB**: Descomprimir el ZIP, extraer los archivos XHTML internos, limpiar tags HTML y concatenar el texto
- **MOBI/AZW3/FB2/CBZ**: Enviar como binario a Gemini 2.5 Flash (soporta múltiples formatos nativamente) para extracción de contenido
- Aplicar el mismo resumen con AI que ya existe para textos largos (>5000 chars)

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| `src/components/crear-skill/SkillChat.tsx` | Agregar extensiones ebook al `accept` |
| `supabase/functions/process-attachment/index.ts` | Agregar handler para ebooks |

