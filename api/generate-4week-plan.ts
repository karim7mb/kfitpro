export const config = { runtime: 'edge' }

interface EjercicioRutina {
  id: string
  nombre: string
  series: number
  repsMin: number
  repsMax: number
  peso: number
  rpe: number
  rir: number
  descanso: number
  superset?: boolean
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
      // Semana 4: deload — -40% volumen, RPE 6-8 (RIR +3, alejado del fallo)
      if (weekNum === 4) {
        return {
          ...ej,
          id: baseId,
          series: Math.max(2, Math.round(ej.series * 0.6)),
          rpe: Math.min(8, Math.max(6, ej.rpe - 2)),
          rir: Math.min(5, (ej.rir ?? 3) + 3),
        }
      }
      // Semana 2: +2 series, RPE +0.5, RIR -1 (más cerca del fallo)
      // Semana 3: +4 series, RPE +1, RIR -2, repsMax -2 (pico MAV)
      const extraSeries = (weekNum - 1) * 2
      const extraRpe = (weekNum - 1) * 0.5
      return {
        ...ej,
        id: baseId,
        series: Math.min(6, ej.series + extraSeries),
        rpe: Math.min(9.5, ej.rpe + extraRpe),
        rir: Math.max(0, (ej.rir ?? 3) - (weekNum - 1)),
        repsMax: weekNum === 3 ? Math.max(ej.repsMin + 1, ej.repsMax - 2) : ej.repsMax,
      }
    }),
  }))
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { nivel, diasEntreno, tiempoEntrenoSemana, objetivo, lesiones, nombre, genero, equipamiento } = await req.json()

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

    const generoLine = genero === 'mujer'
      ? '\n- Género: Mujer — prioriza glúteos e isquiotibiales: hip thrust, sentadilla búlgara, RDL, abducción de cadera, zancadas. En tren superior: reduce carga en compuestos pesados, añade más trabajo de hombros y brazos con rangos altos.'
      : '\n- Género: Hombre — equilibrio general con énfasis en tren superior (press, jalones, remo) y pierna completa.'

    const equipLabels: Record<string, string> = {
      gimnasio_completo: 'Gimnasio completo: barras, mancuernas, poleas, cables, máquinas. Todos los ejercicios disponibles.',
      gimnasio_basico: 'Gimnasio básico: barras, mancuernas y máquinas fundamentales. Sin poleas o máquinas especializadas.',
      casa: 'Casa con mancuernas: SOLO mancuernas y peso corporal. Ningún ejercicio con máquinas, poleas, barras o cable. Adapta todo a mancuernas o bodyweight.',
      sin_equipamiento: 'Sin equipamiento: SOLO peso corporal. Ningún ejercicio con ningún equipo. Sentadillas, flexiones, dominadas, fondos, zancadas, plancha.',
    }
    const equipamientoLine = `\n- Equipamiento: ${equipLabels[equipamiento] ?? equipLabels['gimnasio_completo']}`

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
1. VOLUMEN (MEV/MAV): Semana 1 empieza en MEV (~6-10 sets/músculo/semana). Semanas 2-3 suben hacia MAV. Semana 4 = deload.
2. FRECUENCIA: Cada grupo muscular 2x por semana mínimo. Diseña el split para cumplirlo.
3. DOBLE PROGRESIÓN: Aumenta reps primero (dentro del rango), luego peso. Rango repsMin-repsMax con diferencia de 3-4 reps.
4. SFR (Stimulus-to-Fatigue Ratio): Prioriza ejercicios con alto estímulo y fatiga manejable.
5. PARTIALES EN POSICIÓN ELONGADA (Long Length Partials — LLP): La ciencia muestra que entrenar en la posición más estirada del músculo produce MAYOR hipertrofia que el rango completo (7/8 estudios confirman). En la ÚLTIMA SERIE de ejercicios de jalón, remo, curl femoral y aperturas: cuando no puedas completar una rep completa, continúa con 4-6 repeticiones parciales en la mitad inferior (posición elongada) hasta el fallo real.
6. ESTIRAMIENTO BAJO CARGA: Incluye al menos 1 ejercicio por sesión que cargue el músculo en posición elongada (curl en banco inclinado, press inclinado, RDL, extensión de tríceps overhead, aperturas en cable).

RANGOS DE REPETICIONES Y MÉTRICAS (Semana 1 — base MEV):
- Compuestos (sentadilla, press, peso muerto, remo): 4-6 reps — RPE 7-8 — RIR 3 — descanso 180-240s
- Accesorios (press mancuernas, jalones, remo máquina): 8-12 reps — RPE 8 — RIR 2 — descanso 90-120s
- Aislamientos (curl, extensión, laterales, gemelo): 12-20 reps — RPE 8-9 — RIR 1 — descanso 60-90s

RIR (Reps In Reserve): cuántas repeticiones quedan en el depósito al parar la serie. RIR 3 = conservador, RIR 0 = fallo absoluto. Semana 1 conservador; semanas 2-3 reducen RIR progresivamente hasta el fallo.

DESCANSOS: incluye el campo "descanso" en segundos (compuesto: 180-240s, accesorio: 90-120s, aislamiento: 60-90s).

TÉCNICA EXCÉNTRICA LENTA: En extensión de cuádriceps en máquina usa negativa de 3 segundos. La cabeza del recto femoral (SOLO activa en extensión de rodilla aislada, no en sentadilla) necesita este trabajo específico.

SUPERSETS ANTAGONISTAS (opcional, para sesiones con poco tiempo):
Para maximizar eficiencia, agrupa pares antagonistas. Marca el segundo ejercicio del par con "superset": true.
Pares válidos: press pecho + remo espalda | curl bíceps + extensión tríceps | extensión cuádriceps + curl femoral | press hombros + jalón.
NUNCA superset de dos compuestos pesados. Solo cuando tenga sentido por tiempo o grupo muscular.

CALENTAMIENTO (implícito antes de cada compuesto principal): el cliente hará 50%×10 → 70%×5 → 85%×2. No lo incluyas en el JSON.

SPLITS POR DÍAS:
- 2-3 días → Full Body, rotando énfasis
- 4 días → Upper/Lower (2x cada grupo)
- 5 días → Push/Pull/Legs/Upper/Lower
- 6 días → PPL x2 (Push-Pull-Legs repetido)

ESTRUCTURA DE CADA SESIÓN:
- 1-2 ejercicios compuestos (base del estímulo)
- 2-3 accesorios (volumen adicional)
- 1-2 aislamientos (pump final y conexión mente-músculo)
- Total: 5-7 ejercicios por sesión

EJERCICIOS POR GRUPO MUSCULAR (tier list Nippard — prioriza S+ y S):

PECHO:
- S+: Press en máquina de pecho (chest press machine)
- S: Aperturas en cable sentado (seated cable pec fly) — posición elongada ideal
- A: Press inclinado agarre cerrado con barra (undulating: 8 reps → 5 reps pesado → 15 reps pump), press inclinado mancuernas, press plano mancuernas, dips, pec deck, cruces en cable

ESPALDA:
- S: Jalón al pecho agarre ancho, jalón agarre neutro un brazo (half-kneeling), remo en máquina con soporte pectoral (chest supported row), remo en cable, remo Meadows
- A: Dominadas (1 serie AMRAP al fallo), remo con mancuerna con impulso controlado (croc row), pullover en cable

HOMBROS:
- S (lateral): Elevación lateral en cable (tensión constante), elevación Y inclinada en banco 20-30° (incline dumbbell Y-raise)
- S (posterior): Pájaro en pec deck inverso LATERAL (brazos cruzados al frente para ROM completo de deltoides posterior), cruces en cable invertido
- A+ (anterior): Press hombros en máquina
- A: Face pull con cuerda, press hombros mancuernas sentado
- EVITAR: Elevaciones frontales (tier D), press militar de pie (tier B)

CUÁDRICEPS:
- S+: Hack squat
- S: Sentadilla con barra, sentadilla búlgara, sentadilla en Smith
- A: Prensa 45°, extensión de cuádriceps en máquina (excéntrica lenta 3s — esencial para recto femoral)

GLÚTEOS:
- S: Zancada caminando (walking lunges — sin igual para glúteos), abducción de cadera en máquina, extensión de espalda 45° con énfasis glúteo
- A: Hip thrust en máquina, RDL (glúteo inferior), sentadilla búlgara con inclinación al frente, step ups
- Para mujeres: prioriza abducción (S), hip thrust máquina (A), RDL y zancadas

ISQUIOTIBIALES:
- S+: Curl femoral SENTADO (seated hamstring curl) — mucho mayor hipertrofia que el tumbado por posición elongada
- A: RDL, curl femoral tumbado, glute ham raise / nordic curl (negativa controlada)

BÍCEPS:
- S+: Curl bayesiano en cable (bayesian cable curl, de espaldas a la polea) — máximo estiramiento
- S: Curl predicador con mancuerna, curl predicador en máquina
- A: Curl con barra EZ, curl inclinado en banco, curl tumbado en banco

TRÍCEPS:
- S+: Extensión de tríceps overhead en polea con barra — posición elongada = máxima hipertrofia (estudios muestran ~40% más que press down)
- S: Press francés con barra (skullcrusher), floor reset skull crusher (fuerza, 6-8 reps)
- A: Press de tríceps en polea (pressdown), extensión overhead mancuerna un brazo, dips agarre cerrado

GEMELOS:
- Elevación de talones de pie (gastroc — más responsivo), elevación de talones sentado (sóleo)
- Técnica: pausa 1s abajo, contracción completa arriba. Drop set en última serie (-30-40% peso).

ABDOMEN:
- Dragon flags (fuerza core completa), crunch en cable, plancha

CRITERIOS DE SELECCIÓN: 1) Alta tensión en posición elongada 2) Sin dolor articular 3) Posibilidad de sobrecarga progresiva 4) Priorizar máquinas sobre peso libre cuando el SFR sea mejor.

Peso siempre 0. Usa nombres de ejercicios en español.
IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown.`,
        messages: [{
          role: 'user',
          content: `Crea la SEMANA 1 (base MEV) de una rutina de 4 semanas usando metodología Nippard para:
- Nivel: ${nivelLabels[nivel] ?? nivel}
- Objetivo: ${objLabels[objetivo] ?? objetivo}
- Días de entrenamiento: ${diasNum} días/semana → elige el split más adecuado
- Tiempo por sesión: ${tiempoLabels[tiempoEntrenoSemana] ?? tiempoEntrenoSemana}${generoLine}${equipamientoLine}${lesionesLine}

Esta semana 1 es la base MEV. Semanas 2-3 suben volumen e intensidad, semana 4 = deload (volumen -40%, RPE 6-8).
Cada grupo muscular aparece mínimo 2x/semana. Prioriza ejercicios S+ y S del tier list. Incluye extensión de cuádriceps (recto femoral) y curl femoral sentado en días de pierna. Incluye al menos 1 ejercicio por sesión en posición elongada del músculo.

Devuelve SOLO este JSON (ids: w1d1, w1d2...; ejercicios: w1e1, w1e2...). Cada ejercicio DEBE incluir: rir, descanso (segundos), y superset: true si es antagonista del anterior:
{"nombre":"${nombre ?? 'Plan 4 Semanas'}","descripcion":"Semana 1 — Base MEV","dias":[{"id":"w1d1","nombre":"Día 1","titulo":"Empuje — Pecho, Hombros y Tríceps","ejercicios":[{"id":"w1e1","nombre":"Press inclinado agarre cerrado con barra","series":3,"repsMin":5,"repsMax":8,"peso":0,"rpe":7,"rir":3,"descanso":210},{"id":"w1e2","nombre":"Press en máquina de pecho","series":3,"repsMin":10,"repsMax":14,"peso":0,"rpe":8,"rir":2,"descanso":120},{"id":"w1e3","nombre":"Aperturas en cable sentado","series":3,"repsMin":12,"repsMax":16,"peso":0,"rpe":8,"rir":2,"descanso":90},{"id":"w1e4","nombre":"Elevaciones laterales en cable","series":3,"repsMin":15,"repsMax":20,"peso":0,"rpe":9,"rir":1,"descanso":75},{"id":"w1e5","nombre":"Extensión tríceps overhead en polea con barra","series":3,"repsMin":12,"repsMax":16,"peso":0,"rpe":8,"rir":2,"descanso":75}]}]}`,
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
