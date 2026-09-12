export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { sexo, edad, peso, altura, actividad, objetivo, calorias, numComidas, protG, carbsG, fatG, perfilNutricional } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'Sin ANTHROPIC_API_KEY' }, { status: 500 })

    const objLabels: Record<string, string> = {
      definicion: 'definición muscular (déficit -400 kcal)',
      volumen: 'volumen muscular (superávit +400 kcal)',
      mantenimiento: 'mantenimiento de peso',
      perdida: 'pérdida de grasa (déficit -600 kcal)',
    }
    const actLabels: Record<string, string> = {
      sedentario: 'sedentario',
      ligero: 'actividad ligera (1-3 días/semana)',
      moderado: 'actividad moderada (4-5 días/semana)',
      activo: 'muy activo (6-7 días/semana)',
    }
    const dietaLabels: Record<string, string> = {
      omnivoro: 'omnívora', vegetariano: 'vegetariana', vegano: 'vegana',
      pescatariano: 'pescatariana', sin_gluten: 'sin gluten', halal: 'halal', kosher: 'kosher',
    }
    const presupuestoLabels: Record<string, string> = {
      economico: 'económico (ingredientes accesibles y baratos)',
      moderado: 'moderado (ingredientes estándar de supermercado)',
      premium: 'premium (ingredientes de calidad sin restricción de precio)',
    }
    const habilidadLabels: Record<string, string> = {
      principiante: 'principiante (recetas simples, mínima preparación)',
      intermedio: 'intermedio (puede cocinar recetas básicas)',
      avanzado: 'avanzado (maneja técnicas culinarias variadas)',
    }

    const perfilLines: string[] = []
    if (perfilNutricional) {
      if (perfilNutricional.tipoDieta) perfilLines.push(`- Dieta: ${dietaLabels[perfilNutricional.tipoDieta] ?? perfilNutricional.tipoDieta}`)
      if (perfilNutricional.presupuesto) perfilLines.push(`- Presupuesto: ${presupuestoLabels[perfilNutricional.presupuesto] ?? perfilNutricional.presupuesto}`)
      if (perfilNutricional.habilidadCulinaria) perfilLines.push(`- Habilidad culinaria: ${habilidadLabels[perfilNutricional.habilidadCulinaria] ?? perfilNutricional.habilidadCulinaria}`)
      if (perfilNutricional.alergias?.length) perfilLines.push(`- Alergias/intolerancias (EXCLUIR): ${perfilNutricional.alergias.join(', ')}`)
      if (perfilNutricional.aversiones?.length) perfilLines.push(`- Aversiones (evitar o sustituir): ${perfilNutricional.aversiones.join(', ')}`)
      if (perfilNutricional.preferencias?.length) perfilLines.push(`- Preferencias (incluir siempre que sea posible): ${perfilNutricional.preferencias.join(', ')}`)
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        system: `Eres un nutricionista deportivo experto. Creas planes de alimentación realistas para personas que hacen ejercicio.
Reglas de porciones: máx 220g proteína animal por comida, máx 180g carbohidrato cocido por comida, máx 35g proteína whey, aceite de oliva máx 15g.
Definición/pérdida: sin carbohidratos en la cena. Volumen: carbohidratos en todas las comidas.
Siempre incluye verduras en comidas principales. Los macros deben ser exactos para los gramos indicados.
Respeta ESTRICTAMENTE las alergias e intolerancias del cliente (no incluyas esos alimentos bajo ningún concepto).
IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional, sin markdown.`,
        messages: [
          {
            role: 'user',
            content: `Crea un plan nutricional diario de ${numComidas} comidas para:
- Sexo: ${sexo}, Edad: ${edad} años, Peso: ${peso} kg, Altura: ${altura} cm
- Actividad: ${actLabels[actividad] ?? actividad}
- Objetivo: ${objLabels[objetivo] ?? objetivo}
- Calorías objetivo: ${calorias} kcal/día
- Macros objetivo: ${protG}g proteínas · ${carbsG}g carbohidratos · ${fatG}g grasas${perfilLines.length ? '\n' + perfilLines.join('\n') : ''}

Devuelve SOLO este JSON (sin ningún texto antes o después):
{"comidas":[{"nombre":"Desayuno","hora":"08:00","alimentos":[{"nombre":"Avena en copos","gramos":80,"calorias":296,"proteinas":10,"carbos":48,"grasas":6},{"nombre":"Claras de huevo","gramos":150,"calorias":78,"proteinas":16,"carbos":1,"grasas":0}]},{"nombre":"Almuerzo","hora":"13:00","alimentos":[{"nombre":"Pechuga de pollo","gramos":180,"calorias":198,"proteinas":41,"carbos":0,"grasas":4},{"nombre":"Arroz integral cocido","gramos":150,"calorias":185,"proteinas":4,"carbos":39,"grasas":2},{"nombre":"Brócoli","gramos":150,"calorias":51,"proteinas":4,"carbos":10,"grasas":0}]}]}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Claude ${res.status}: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const content: string = data.content?.[0]?.type === 'text' ? data.content[0].text : ''
    if (!content) return Response.json({ error: 'Respuesta vacía de Claude' }, { status: 500 })

    const cleaned = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()

    for (const pattern of [/\{[\s\S]*\}/, /\[[\s\S]*\]/]) {
      const match = cleaned.match(pattern)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          const comidas = Array.isArray(parsed) ? parsed : (parsed.comidas ?? parsed.meals ?? Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v)))
          if (Array.isArray(comidas) && comidas.length > 0) return Response.json({ comidas })
        } catch { /* continue */ }
      }
    }

    return Response.json({ error: `Sin JSON válido: ${content.slice(0, 300)}` }, { status: 500 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
