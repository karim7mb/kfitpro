export const config = { runtime: 'edge' }

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
            role: 'system',
            content: `You are a sports nutritionist. Return ONLY a JSON object with a "comidas" array.
Example: {"comidas":[{"nombre":"Desayuno","hora":"08:00","alimentos":[{"nombre":"Avena en copos","gramos":80,"calorias":296,"proteinas":10,"carbos":48,"grasas":6}]}]}
Rules: use Spanish food names, max 250g animal protein per meal, max 200g cooked carbs per meal, max 40g whey, include vegetables in main meals, macros must be accurate for the gram amounts.`,
          },
          {
            role: 'user',
            content: `Create a ${numComidas}-meal daily nutrition plan for: ${sexo} ${edad}yo ${peso}kg ${altura}cm, activity level ${actividad}, goal ${objetivo}, ${calorias} kcal/day. Macros: ${protG}g protein, ${carbsG}g carbs, ${fatG}g fat. Return JSON only.`,
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
    if (!content) return Response.json({ error: `Respuesta vacía. Keys: ${Object.keys(msg).join(', ')}. Full: ${JSON.stringify(data).slice(0, 400)}` }, { status: 500 })

    // Try to extract JSON: first as object with comidas key, then as bare array
    const cleaned = content.replace(/```(?:json)?/gi, '').replace(/```/g, '')
    let comidas: unknown[] | null = null

    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try {
        const obj = JSON.parse(objMatch[0])
        const arr = obj.comidas ?? obj.meals ?? Object.values(obj).find(v => Array.isArray(v))
        if (Array.isArray(arr)) comidas = arr
      } catch { /* fall through */ }
    }

    if (!comidas) {
      const arrMatch = cleaned.match(/\[[\s\S]*\]/)
      if (arrMatch) {
        try { comidas = JSON.parse(arrMatch[0]) } catch { /* fall through */ }
      }
    }

    if (!Array.isArray(comidas)) return Response.json({ error: `Sin comidas: ${content.slice(0, 500)}` }, { status: 500 })

    return Response.json({ comidas })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
