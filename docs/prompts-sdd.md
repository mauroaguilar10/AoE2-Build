# Prompts SDD por fase (basado en mouredev/hello-sdd)

| Fase | Prompt |
|---|---|
| 1. Constitución | Proponme la constitución de este proyecto: N principios cortos y verificables sobre stack, calidad, tests y límites. Máx. 15 líneas. Espera mi aprobación. |
| 2. Spec (entrevista) | NO escribas código. Hazme preguntas de una en una, todas las que consideres necesarias (sin límite fijo), sobre casos límite, errores y alcance, hasta que no quede ninguna ambigüedad relevante, y después genera spec.md con RF numerados en EARS, fuera de alcance y criterios de finalización. Solo el QUÉ y el POR QUÉ. |
| 3. Clarificación | Revisa la spec como un QA profesional: ambigüedades, contradicciones, casos límite ausentes, conflictos con la constitución. Solo detecta, no resuelvas. |
| 4. Plan | Lee constitución y spec. Sin código: genera plan.md con módulos, modelo de datos, decisiones justificadas (con la alternativa descartada) y estrategia de tests. Indica qué RF cubre cada parte. |
| 5. Tareas | Divide el plan en tareas de <30 min, ordenadas por dependencia, cada una con sus RF y una línea "Hecho cuando:" verificable. Con checkboxes. |
| 6. Implementación | Implementa SOLO la tarea Tn. Tests primero. Ejecuta la suite y muéstrame el resultado. Marca Tn como hecha y PÁRATE. |
| 7. Validación | Recorre la spec RF por RF: qué test cubre cada uno y su resultado. Veredicto final: ¿spec cumplida? |
| 8. Cambio | Nuevo requisito: <...>. NO toques código: actualiza primero la spec y muéstrame el diff. |
