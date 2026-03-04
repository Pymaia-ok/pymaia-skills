

## Situación actual

Se tradujeron exitosamente **~280 skills** hasta ahora. Todo funciona correctamente — la Edge Function traduce, guarda en la DB, y el frontend ya muestra el contenido traducido cuando el idioma es español.

**El problema**: quedan ~13,900 skills y ejecutar esto manualmente desde acá es inviable (700+ llamadas).

## Plan: Botón de traducción en el panel Admin

Agregar un botón en la página Admin que ejecute la traducción en lotes automáticamente desde el navegador, con progreso visual:

1. **Botón "Traducir skills pendientes"** en `/admin` que:
   - Llama a la Edge Function en un loop automático
   - Muestra progreso en tiempo real (barra de progreso + contador "X de Y traducidas")
   - Pausa 1 segundo entre llamadas para evitar rate limits
   - Permite detener el proceso manualmente
   
2. **Sin cambios de DB ni Edge Function** — todo ya existe, solo falta la UI para dispararlo

### Resultado
El admin puede iniciar la traducción masiva, ver el progreso, y dejarla corriendo hasta que se complete. Puede pausar y retomar en cualquier momento.

