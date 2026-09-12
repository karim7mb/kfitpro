export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { nivel, diasEntreno, tiempoEntrenoSemana, objetivo, lesiones, nombre } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'Sin ANTHROPIC_API_KEY' }, { status: 500 })

    const nivelLabels: Record<string, string> = {
      principiante: 'principiante (ejercicios básicos, poco volumen, técnica simple)',
      intermedio: 'intermedio (ejercicios compuestos y accesorios, volumen moderado)',
      avanzado: 'avanzado (alta intensidad, técnicas avanzadas, alto volumen)',
    }
    const objLabels: Record<string, string> = {
      definicion: 'definición (más repeticiones, menos descanso, cardio incluido)',
      volumen: 'hipertrofia / volumen muscular (rangos 8-12 reps, alta tensión mecánica)',
      mantenimiento: 'mantenimiento (equilibrio fuerza-resistencia)',
      perdida: 'pérdida de grasa (circuitos, supersets, cardio)',
    }
    const tiempoLabels: Record<string, string> = {
      '1-2h': '1-2 horas por semana (sesiones cortas de 20-30 min)',
      '3-4h': '3-4 horas por semana (sesiones de 45-60 min)',
      '5-7h': '5-7 horas por semana (sesiones de 60-75 min)',
      'mas7h': 'más de 7 horas por semana (sesiones de 75-90 min)',
    }

    const lesionesLine = lesiones?.length
      ? `\n- Lesiones/limitaciones (EXCLUIR ejercicios que las agraven): ${lesiones.join(', ')}`
      : ''

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: `Eres un entrenador personal experto. Creas rutinas de entrenamiento semanales estructuradas y efectivas.
Usa ejercicios reales con nombres en español. RPE entre 6-9. Series entre 2-5. Reps entre 6-20.
Peso siempre 0 (el cliente lo ajustará). Cada día tiene 4-7 ejercicios.
IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional, sin markdown.`,
        messages: [{
          role: 'user',
          content: `Crea una rutina de entrenamiento semanal para:
- Nivel: ${nivelLabels[nivel] ?? nivel}
- Objetivo: ${objLabels[objetivo] ?? objetivo}
- Días a la semana: ${diasEntreno}
- Tiempo disponible: ${tiempoLabels[tiempoEntrenoSemana] ?? tiempoEntrenoSemana}${lesionesLine}

Devuelve SOLO este JSON (sin texto antes o después):
{"nombre":"${nombre ?? 'Rutina IA'}","dias":[{"id":"d1","nombre":"Día 1","titulo":"Pecho y Tríceps","ejercicios":[{"id":"e1","nombre":"Press banca plano","series":4,"repsMin":8,"repsMax":12,"peso":0,"rpe":7},{"id":"e2","nombre":"Press inclinado mancuernas","series":3,"repsMin":10,"repsMax":15,"peso":0,"rpe":7}]}]}`,
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Claude ${res.status}: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const content: string = data.content?.[0]?.type === 'text' ? data.content[0].text : ''
    if (!content) return Response.json({ error: 'Respuesta vacía' }, { status: 500 })

    const cleaned = content.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return Response.json({ error: `Sin JSON válido: ${content.slice(0, 200)}` }, { status: 500 })

    const parsed = JSON.parse(match[0])
    if (!parsed.dias || !Array.isArray(parsed.dias)) return Response.json({ error: 'Formato inválido' }, { status: 500 })

    return Response.json({ nombre: parsed.nombre, dias: parsed.dias })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
