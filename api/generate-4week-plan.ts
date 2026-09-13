export const config = { runtime: 'edge' }

interface EjercicioRutina {
  id: string
  nombre: string
  series: number
  repsMin: number
  repsMax: number
  peso: number
  rpe: number
}

interface DiaRutina {
  id: string
  nombre: string
  titulo: string
  ejercicios: EjercicioRutina[]
}

function deriveWeek(week1Days: DiaRutina[], weekNum: 2 | 3 | 4): DiaRutina[] {
  return week1Days.map(dia => ({
    ...dia,
    id: dia.id.replace(/w1|d(\d)/, (m, n) => weekNum === 4 ? `w4d${n ?? m}` : `w${weekNum}d${n ?? m}`),
    ejercicios: dia.ejercicios.map((ej, i) => {
      const baseId = `w${weekNum}e${i + 1}`
      if (weekNum === 4) {
        return {
          ...ej,
          id: baseId,
          series: Math.max(2, Math.round(ej.series * 0.5)),
          rpe: Math.max(5, ej.rpe - 2),
        }
      }
      const extra = weekNum - 1
      return {
        ...ej,
        id: baseId,
        series: Math.min(6, ej.series + extra),
        rpe: Math.min(9, ej.rpe + (weekNum - 1) * 0.5),
        repsMax: weekNum === 3 ? Math.max(ej.repsMin, ej.repsMax - 2) : ej.repsMax,
      }
    }),
  }))
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { nivel, diasEntreno, tiempoEntrenoSemana, objetivo, lesiones, nombre } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return Response.json({ error: 'Sin ANTHROPIC_API_KEY' }, { status: 500 })

    const nivelLabels: Record<string, string> = {
      principiante: 'principiante (ejercicios básicos, técnica simple, bajo volumen)',
      intermedio: 'intermedio (compuestos + accesorios, volumen moderado)',
      avanzado: 'avanzado (alta intensidad, técnicas avanzadas, alto volumen)',
    }
    const objLabels: Record<string, string> = {
      definicion: 'definición (rangos 12-15 reps, descansos cortos)',
      volumen: 'hipertrofia (rangos 8-12 reps, alta tensión mecánica)',
      mantenimiento: 'mantenimiento (equilibrio fuerza-resistencia)',
      perdida: 'pérdida de grasa (circuitos, supersets)',
      fuerza: 'fuerza (rangos 3-6 reps, cargas altas)',
    }
    const tiempoLabels: Record<string, string> = {
      '1-2h': 'sesiones cortas 25-35 min',
      '3-4h': 'sesiones 45-60 min',
      '5-7h': 'sesiones 60-75 min',
      'mas7h': 'sesiones 75-90 min',
    }

    const lesionesLine = lesiones?.length
      ? `\n- Lesiones/limitaciones (EXCLUIR ejercicios que las agraven): ${lesiones.join(', ')}`
      : ''

    const diasNum = Number(diasEntreno) || 3

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: `Eres un entrenador personal experto en programación de fuerza e hipertrofia.
Creas rutinas semanales estructuradas con sobrecarga progresiva.
Usa nombres de ejercicios en español. RPE entre 6-9. Series entre 2-5. Reps entre 6-20.
Peso siempre 0 (el cliente lo ajustará). Cada día tiene 4-7 ejercicios.
IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.`,
        messages: [{
          role: 'user',
          content: `Crea la SEMANA 1 de una rutina de 4 semanas para:
- Nivel: ${nivelLabels[nivel] ?? nivel}
- Objetivo: ${objLabels[objetivo] ?? objetivo}
- Días de entrenamiento por semana: ${diasNum}
- Tiempo por sesión: ${tiempoLabels[tiempoEntrenoSemana] ?? tiempoEntrenoSemana}${lesionesLine}

Nota: Este plan es la base. Las semanas 2-3 aumentarán volumen e intensidad, la semana 4 será deload.
Diseña ejercicios apropiados para progresar durante 4 semanas.

Devuelve SOLO este JSON (ids como w1d1, w1d2..., ejercicios como w1e1, w1e2...):
{"nombre":"${nombre ?? 'Plan 4 Semanas'}","descripcion":"Semana 1 - Base y adaptación","dias":[{"id":"w1d1","nombre":"Día 1","titulo":"Pecho y Tríceps","ejercicios":[{"id":"w1e1","nombre":"Press banca plano","series":4,"repsMin":8,"repsMax":12,"peso":0,"rpe":7}]}]}`,
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
    if (!parsed.dias || !Array.isArray(parsed.dias)) {
      return Response.json({ error: 'Formato inválido' }, { status: 500 })
    }

    const week1: DiaRutina[] = parsed.dias
    const semanas = [
      { semana: 1, descripcion: 'Semana 1 — Base y adaptación', dias: week1 },
      { semana: 2, descripcion: 'Semana 2 — Progresión de volumen (+1 serie)', dias: deriveWeek(week1, 2) },
      { semana: 3, descripcion: 'Semana 3 — Pico de intensidad (+2 series, más peso)', dias: deriveWeek(week1, 3) },
      { semana: 4, descripcion: 'Semana 4 — Deload (50% volumen, recuperación)', dias: deriveWeek(week1, 4) },
    ]

    const fechaInicio = new Date().toISOString().split('T')[0]

    return Response.json({
      nombre: parsed.nombre,
      semanas,
      fecha_inicio: fechaInicio,
      dias: week1,
    })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
