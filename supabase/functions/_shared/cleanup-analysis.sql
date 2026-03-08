-- Limpiar skills de baja calidad de skills.sh manteniendo las mejores
WITH low_quality_skills AS (
  SELECT id, slug, display_name, tagline, description_human, github_stars, install_count
  FROM skills 
  WHERE status = 'approved'
    AND install_command ILIKE '%npx skills add%'
    AND (
      -- Taglines genéricos de monorepos
      tagline ILIKE '%collection of awesome%' OR
      tagline ILIKE '%curated list of awesome%' OR
      tagline ILIKE '%the react framework%' OR
      -- Descripciones muy cortas o genéricas
      LENGTH(description_human) < 30 OR
      description_human ILIKE '%collection of awesome%' OR
      -- Sin tracción y sin GitHub stars reales
      (github_stars = 0 AND install_count = 0) OR
      -- Stars infladas de monorepos (> 40k con descripciones genéricas)
      (github_stars > 40000 AND (
        tagline ILIKE '%collection%' OR 
        description_human ILIKE '%collection%'
      ))
    )
),
skills_to_clean AS (
  SELECT 
    id,
    slug,
    display_name,
    CASE 
      WHEN tagline ILIKE '%collection of awesome%' THEN 'tagline_monorepo'
      WHEN LENGTH(description_human) < 30 THEN 'desc_corta' 
      WHEN github_stars = 0 AND install_count = 0 THEN 'sin_traccion'
      WHEN github_stars > 40000 THEN 'stars_infladas'
      ELSE 'otros'
    END as problema_tipo,
    github_stars,
    install_count
  FROM low_quality_skills
)
-- Ver estadísticas antes de limpiar
SELECT 
  problema_tipo,
  COUNT(*) as cantidad,
  ROUND(AVG(github_stars), 0) as promedio_stars,
  MIN(display_name) as ejemplo_skill
FROM skills_to_clean 
GROUP BY problema_tipo
ORDER BY cantidad DESC;