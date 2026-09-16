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
      // Semana 4: deload — 50% volumen, -2 RPE (recuperación activa)
      if (weekNum === 4) {
        return {
          ...ej,
          id: baseId,
          series: Math.max(2, Math.round(ej.series * 0.5)),
          rpe: Math.max(5, ej.rpe - 2),
        }
      }
      // Semana 2: +2 series (MEV → mid-MAV), +0.5 RPE (doble progresión: más reps)
      // Semana 3: +4 series vs semana 1 (mid-MAV → pico), +1 RPE, repsMax -2 (más peso)
      const extraSeries = (weekNum - 1) * 2
      const extraRpe = (weekNum - 1) * 0.5
      return {
        ...ej,
        id: baseId,
        series: Math.min(6, ej.series + extraSeries),
        rpe: Math.min(9.5, ej.rpe + extraRpe),
        repsMax: weekNum === 3 ? Math.max(ej.repsMin + 1, ej.repsMax - 2) : ej.repsMax,
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
        system: `Eres un entrenador personal experto en hipertrofia basado en la metodología de Jeff Nippard y la ciencia del entrenamiento (Schoenfeld, Israetel, Helms).

PRINCIPIOS CLAVE:
1. VOLUMEN (MEV/MAV): Semana 1 empieza en MEV (~10 sets/músculo/semana). Semanas 2-3 suben hacia MAV. Semana 4 = deload al 50%.
2. FRECUENCIA: Cada grupo muscular 2x por semana mínimo. Diseña el split para cumplirlo.
3. DOBLE PROGRESIÓN: El cliente aumenta reps primero, luego peso. Por eso da rango repsMin-repsMax con diferencia de 3-4 reps.
4. SFR (Stimulus-to-Fatigue Ratio): Prioriza ejercicios con alto estímulo y fatiga manejable.
5. ESTIRAMIENTO BAJO CARGA: Incluye al menos 1 ejercicio por sesión que cargue el músculo en posición elongada (curl en banco inclinado, press inclinado, RDL, extensión de tríceps overhead, aperturas en cable).

RANGOS DE REPETICIONES:
- Compuestos principales (sentadilla, press, peso muerto, remo): 5-8 reps — RPE 7-8
- Accesorios compuestos (press mancuernas, jalones, remo en máquina): 8-12 reps — RPE 8
- Aislamientos (curl, extensión, lateral raises, gemelo): 12-20 reps — RPE 8-9

SPLITS POR DÍAS:
- 2-3 días → Cuerpo completo (Full Body), rotando énfasis
- 4 días → Upper/Lower (2x cada grupo)
- 5 días → Push/Pull/Legs/Upper/Lower
- 6 días → PPL x2 (Push-Pull-Legs repetido)

ESTRUCTURA DE CADA SESIÓN:
- 1-2 ejercicios compuestos (base del estímulo)
- 2-3 accesorios (volumen adicional)
- 1-2 aislamientos (pump final y conexión mente-músculo)
- Total: 5-7 ejercicios por sesión

EJERCICIOS RECOMENDADOS POR GRUPO:
- Pecho: Press banca, press inclinado mancuernas, aperturas en cable, pec deck
- Espalda: Dominadas/jalón, remo con barra, remo en polea, pullover en cable
- Hombros: Press militar, elevaciones laterales en cable, pájaros, face pulls
- Cuádriceps: Sentadilla, prensa, extensión de cuádriceps, sentadilla búlgara
- Isquios/Glúteos: RDL, curl femoral, hip thrust, buenos días
- Bíceps: Curl con barra, curl en banco inclinado (estiramiento), curl martillo
- Tríceps: Press francés, extensión overhead en polea, fondos, press cerrado
- Gemelos: Elevación de talones de pie, elevación sentado

RPE: Compuestos RPE 7-8, accesorios RPE 8, aislamientos RPE 9. NUNCA al fallo en compuestos con carga espinal.
Peso siempre 0 (el cliente lo ajustará). Usa nombres de ejercicios en español.
IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.`,
        messages: [{
          role: 'user',
          content: `Crea la SEMANA 1 (base MEV) de una rutina de 4 semanas usando metodología Nippard para:
- Nivel: ${nivelLabels[nivel] ?? nivel}
- Objetivo: ${objLabels[objetivo] ?? objetivo}
- Días de entrenamiento: ${diasNum} días/semana → elige el split más adecuado
- Tiempo por sesión: ${tiempoLabels[tiempoEntrenoSemana] ?? tiempoEntrenoSemana}${lesionesLine}

Esta semana 1 es la base MEV. Las semanas 2-3 subirán volumen e intensidad progresivamente, la semana 4 será deload.
Cada grupo muscular debe aparecer al menos 2 veces por semana. Incluye ejercicios que carguen en posición elongada.

Devuelve SOLO este JSON (ids: w1d1, w1d2...; ejercicios: w1e1, w1e2...):
{"nombre":"${nombre ?? 'Plan 4 Semanas'}","descripcion":"Semana 1 — Base MEV","dias":[{"id":"w1d1","nombre":"Día 1","titulo":"Empuje — Pecho, Hombros y Tríceps","ejercicios":[{"id":"w1e1","nombre":"Press banca con barra","series":3,"repsMin":6,"repsMax":10,"peso":0,"rpe":7},{"id":"w1e2","nombre":"Press inclinado mancuernas","series":3,"repsMin":10,"repsMax":14,"peso":0,"rpe":8},{"id":"w1e3","nombre":"Aperturas en cable","series":3,"repsMin":12,"repsMax":16,"peso":0,"rpe":9},{"id":"w1e4","nombre":"Elevaciones laterales en cable","series":3,"repsMin":15,"repsMax":20,"peso":0,"rpe":9},{"id":"w1e5","nombre":"Extensión tríceps overhead en polea","series":3,"repsMin":12,"repsMax":16,"peso":0,"rpe":8}]}]}`,
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
      { semana: 1, descripcion: 'Semana 1 — MEV: Base y técnica (RPE 7-8)', dias: week1 },
      { semana: 2, descripcion: 'Semana 2 — Mid-MAV: +2 series, doble progresión en reps', dias: deriveWeek(week1, 2) },
      { semana: 3, descripcion: 'Semana 3 — Pico MAV: +4 series, más peso, RPE 8-9', dias: deriveWeek(week1, 3) },
      { semana: 4, descripcion: 'Semana 4 — Deload: 50% volumen, supercompensación', dias: deriveWeek(week1, 4) },
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
