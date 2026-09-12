export const config = { runtime: 'edge' }

function findArray(obj: unknown): unknown[] | null {
  if (Array.isArray(obj) && obj.length > 0) return obj
  if (typeof obj === 'object' && obj !== null) {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = findArray(v)
      if (found) return found
    }
  }
  return null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { sexo, edad, peso, altura, actividad, objetivo, calorias, numComidas, protG, carbsG, fatG } = await req.json()

    const apiKey = process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY
    if (!apiKey) return Response.json({ error: 'Sin API key de Groq' }, { status: 500 })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `You are a sports nutritionist. Create a ${numComidas}-meal daily plan for: ${sexo} ${edad}yo ${peso}kg ${altura}cm, ${actividad} activity, ${objetivo} goal, ${calorias} kcal. Macros: ${protG}g protein, ${carbsG}g carbs, ${fatG}g fat.

Return ONLY a JSON object like this (no other text):
{"comidas":[{"nombre":"Desayuno","hora":"08:00","alimentos":[{"nombre":"Avena en copos","gramos":80,"calorias":296,"proteinas":10,"carbos":48,"grasas":6}]},{"nombre":"Almuerzo","hora":"13:00","alimentos":[{"nombre":"Pechuga de pollo","gramos":180,"calorias":198,"proteinas":41,"carbos":0,"grasas":4}]}]}

Use Spanish food names. Max 250g protein per meal, max 200g cooked carbs, max 40g whey. Include vegetables in main meals.`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Groq ${res.status}: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const msg = data.choices?.[0]?.message ?? {}
    const content: string = msg.content ?? msg.reasoning_content ?? ''

    if (!content) {
      return Response.json({ error: `Vacío. Keys: ${Object.keys(msg).join(',')} | ${JSON.stringify(data).slice(0, 300)}` }, { status: 500 })
    }

    // Extract JSON from response (strip markdown if present)
    const cleaned = content.replace(/```(?:json)?/gi, '').replace(/```/g, '')

    // Try JSON object first, then array
    for (const pattern of [/\{[\s\S]*\}/, /\[[\s\S]*\]/]) {
      const match = cleaned.match(pattern)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          const comidas = findArray(parsed)
          if (comidas && comidas.length > 0) return Response.json({ comidas })
        } catch { /* continue */ }
      }
    }

    return Response.json({ error: `Sin JSON. Modelo devolvió: ${content.slice(0, 500)}` }, { status: 500 })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
