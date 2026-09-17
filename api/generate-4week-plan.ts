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
1. VOLUMEN (MEV/MAV): Semana 1 en MEV (~6-10 sets/músculo/semana). Semanas 2-3 suben a MAV. Semana 4 = deload. Después de ~8 series por músculo por sesión el volumen adicional es "junk volume" sin beneficio — distribúyelo en más días.
2. FRECUENCIA: Cada grupo muscular mínimo 2x/semana. El volumen efectivo por sesión se satura a ~8 sets/músculo — distribuye el volumen en varios días.
3. DOBLE PROGRESIÓN: Aumenta reps primero, luego peso. Rango repsMin-repsMax con diferencia de 3-4 reps. Aumenta algo (carga O reps) cada semana para mantener la progresión.
4. POSICIÓN ELONGADA ES LO MÁS IMPORTANTE: Entrenar el músculo bajo carga en su posición más estirada produce MAYOR hipertrofia (confirmado en 10+ estudios incluyendo sujetos entrenados con 4-5 años de experiencia). Prioriza siempre ejercicios con alta tensión en el estiramiento.
5. PARTIALES EN POSICIÓN ELONGADA (LLP): En la ÚLTIMA SERIE de jalones, remos, curl femoral y aperturas — cuando ya no puedas completar el rango completo, continúa con 4-6 reps parciales en la mitad inferior (posición estirada) hasta el fallo real.
6. DELTOIDES LATERAL = PRIORIDAD: El deltoides lateral es el que da el look 3D. Debe representar el 70-90% del volumen de hombros. El deltoides anterior ya recibe estímulo de cualquier press de pecho — no necesita trabajo adicional en la mayoría de casos.
7. RECTO FEMORAL: Solo se activa completamente con extensión de rodilla aislada. Incluye siempre extensión de cuádriceps en máquina en días de pierna (posición del asiento hacia atrás para mayor estiramiento).
8. ROM COMPLETO = SIEMPRE LA REGLA: NUNCA sacrifiques rango de movimiento por más peso — 5 de 6 estudios confirman ROM completo > parciales. Excepción válida: ejercicios de aislamiento con peso libre (skull crusher, aperturas con mancuernas) donde el tope del movimiento no tiene tensión — parar ligeramente antes del lockout mantiene tensión constante. Cables y máquinas ya tienen tensión constante → usa ROM completo siempre.
9. INTENSIDAD: Empuja lo suficientemente duro. La mayoría de personas NO entrena con suficiente intensidad. RIR 3 en semana 1 → RIR 2 en semana 2 → RIR 1 en semana 3. Las máquinas permiten llegar más cerca del fallo con buena técnica que los pesos libres.

TEMPO Y TÉCNICA:
- Excéntrica: 1-2 segundos controlada (negativas lentas NO dan más hipertrofia que velocidad normal — 3 estudios lo confirman — pero SÍ mejoran seguridad y conexión mente-músculo)
- Concéntrica: explosiva-moderada
- ROM: usar rango completo O partiales en posición elongada — nunca partiales en posición acortada

RANGOS DE REPETICIONES Y MÉTRICAS (Semana 1 — base MEV):
- Compuestos (sentadilla, press, peso muerto, remo): 4-6 reps — RPE 7-8 — RIR 3 — descanso 180-240s
- Accesorios (press mancuernas, jalones, remo máquina): 8-12 reps — RPE 8 — RIR 2 — descanso 90-120s
- Aislamientos (curl, extensión, laterales, gemelo): 12-20 reps — RPE 8-9 — RIR 1 — descanso 60-90s

DESCANSOS en segundos por tipo (compuesto: 180-240s, accesorio: 90-120s, aislamiento: 60-90s).

SUPERSETS ANTAGONISTAS (opcional — solo si el tiempo lo requiere):
Pares válidos: press pecho + remo | curl bíceps + extensión tríceps | extensión cuáds + curl femoral.
Marca el segundo ejercicio del par con "superset": true. NUNCA superset entre dos compuestos pesados.

CALENTAMIENTO (implícito, no incluir en JSON): 50%×10 → 70%×5 → 85%×2 antes de cada compuesto principal.

SPLITS OBLIGATORIOS SEGÚN DÍAS (NO improvises el split — usa el que se indica):
- 2 días → Full Body A + Full Body B (todos los músculos ambos días)
- 3 días → Full Body A + Full Body B + Full Body C (rotando énfasis)
- 4 días → UPPER/LOWER OBLIGATORIO: Día1=Upper A (empuje), Día2=Lower A (cuádriceps), Día3=Upper B (tracción), Día4=Lower B (glúteos/isquios). NUNCA uses Push/Pull/Legs para 4 días — no cumple 2x frecuencia.
- 5 días → Push / Pull / Legs / Upper / Lower
- 6 días → Push / Pull / Legs / Push / Pull / Legs

REGLA DE ORO DE FRECUENCIA: Cada grupo muscular DEBE aparecer exactamente 2 veces por semana. Si un músculo solo aparece 1 vez, el split está mal. Verifica que pecho, espalda, hombros, bíceps, tríceps, cuádriceps, glúteos e isquiotibiales aparezcan en 2 días distintos.

ESTRUCTURA POR SESIÓN: 1-2 compuestos + 2-3 accesorios + 1-2 aislamientos = 5-7 ejercicios.

════════════════════════════════════════════
TIER LIST COMPLETA DE NIPPARD (usa S+ y S siempre que el equipamiento lo permita):
════════════════════════════════════════════

PECHO:
- S+: Press en máquina de pecho — mejor sobrecarga, va a fallo sin riesgo, profundo estiramiento
- S: Aperturas en cable sentado (seated cable pec fly) — máximo estiramiento pectoral
- A: Press inclinado con barra 45° (agarre ligeramente cerrado para más ROM), press inclinado mancuernas, dips (enorme estiramiento pero puede molestar hombros), pec deck, press plano mancuernas
- B: Press banca plano con barra (limita estiramiento por la barra), push-ups con déficit
- F: Hex press, plate press (sin estiramiento), guillotine press con barra (peligroso)

ESPALDA:
- S+: Remo Meadows — máximo estiramiento dorsal + tensión, trabajo unilateral
- S: Jalón un brazo agarre neutro (half-kneeling), dominadas agarre neutro, remo en máquina con soporte pectoral (chest-supported row), remo en cable
- A: Dominadas agarre ancho, remo con mancuerna un brazo, remo con impulso controlado (croc row)
- B: Remo con barra (dispersa tensión por inestabilidad), pull-up con lastre
- C: Peso muerto (como ejercicio de espalda — solo trabaja erectores, sin estiramiento lats)
- F: Renegade row, rack pull (above-knee rack pull = evitar, hip thrust es mejor para glúteos)
TÉCNICA JALÓN: No inclines demasiado el torso hacia atrás — la espalda baja toma el relevo y reduce la carga en los dorsales. Agarre doble prono medio ancho al frente del cuello = mejor combinación de activación. Rango 8-12 reps. Para construir V-taper: jalón ancho (anchura) + remo con soporte (grosor).

HOMBROS — LATERAL (70-90% del volumen de hombros):
- S+: Elevación lateral en cable (máxima tensión en posición elongada, constante)
- A+: Elevación lateral en máquina Atlantis o similar (tensión uniforme)
- A: Elevación Y inclinada en banco 20-30° (incline Y-raise), elevación lateral mancuerna recostado (Arnold-style lying lateral)
- B: Elevación lateral con mancuerna de pie (tensión cero en posición estirada), elevación lateral con inclinación en rack
- D: Elevaciones frontales (el deltoides anterior ya recibe suficiente trabajo del press)

HOMBROS — POSTERIOR:
- S: Pájaro en pec deck inverso LATERAL (girado de lado, brazo cruza el cuerpo — único modo de lograr ROM completo del deltoides posterior), cruces en cable invertido
- A: Face pull con cuerda, pájaro con mancuernas tumbado

HOMBROS — ANTERIOR:
- A+: Press hombros en máquina (mi ejercicio #1 para deltoides anterior — va a fallo sin perder técnica)
- A: Press hombros con mancuernas sentado (unilateral, más ROM)
- B: Press militar con barra de pie, press militar sentado (muy anterior, poco lateral)
TÉCNICA PRESS HOMBROS: Empuja a través de la parte EXTERIOR de las palmas (no interior) — activa la abducción del hombro y maximiza la activación del deltoides. Piensa "empujar hacia arriba y afuera" no "hacia arriba y adentro".

CUÁDRICEPS:
- S+: Hack squat, pendulum squat (arco más natural — el mejor quad builder si está disponible)
- S: Sentadilla con barra (S tier a pesar del recto femoral, por sobrecarga total), sentadilla en Smith (va a fallo sin miedo), sentadilla búlgara
- A: Prensa 45° (buen estiramiento si se lleva profundo), extensión de cuádriceps en máquina con asiento retrasado (esencial para recto femoral — activa las 4 cabezas, nueva investigación confirma más crecimiento con asiento inclinado hacia atrás). Extensión de cuáds: 12-20 reps, capacidad de sobrecarga limitada — progresa por mente-músculo y técnica además de peso.
- B: Zancada (mejor para glúteos que cuádriceps)
- C: Prensa horizontal (ROM limitado, max out rápido)
TÉCNICA SENTADILLA: Cue "enroscar los pies en el suelo" (intentar girarlos hacia fuera sin moverlos) = base estable, evita colapso de rodillas. No es necesario ir ATG — sentadilla paralela es perfectamente válida para hipertrofia y más segura para quienes no tienen la movilidad.

GLÚTEOS:
- S: Hip thrust con barra o en máquina (activa glúteo completo, fácil sobrecarga), abducción de cadera en máquina (inclinada 30° al frente — activa glúteo medio perfectamente), zancada caminando (nada iguala la DOMS de glúteos)
- A: Sentadilla profunda con barra, sentadilla búlgara con pie adelantado y torso inclinado, step-up (caja a altura de rodilla), kickback en máquina (aísla glúteo sin cuádriceps)
- Para mujeres: prioriza abducción en máquina (S), hip thrust (S), zancadas y RDL

ISQUIOTIBIALES:
- S+: Curl femoral SENTADO (1.6× más hipertrofia que el tumbado — posición elongada desde la cadera)
- A: RDL con barra, curl femoral tumbado (también trabaja sartorio — músculo que resalta en poses de cuádriceps cuando estás definido), glute ham raise, nordic curl (negativa controlada)

BÍCEPS:
- S+: Curl bayesiano en cable (de espaldas a la polea baja) — máximo estiramiento en posición elongada, tensión constante, el mejor ejercicio de bíceps
- S: Curl predicador en máquina (bien anclado, va a fallo), curl predicador con mancuerna 45°
- A: Curl inclinado en banco, curl tumbado en banco (extremo estiramiento), curl con barra EZ (más cómodo en muñecas que barra recta)
- B: Curl con barra recta, dominadas (bíceps no es el limitante), curl con mancuerna de pie
- C: Spider curl (posición acortada), drag curl, Scott curl
- F: Waiter curl (fuerza las muñecas, sobrecarga limitada)

TRÍCEPS:
- S+: Extensión de tríceps overhead en polea con barra — posición elongada = máxima hipertrofia de la cabeza larga (~40% más que press down en estudios)
- S: Press francés con barra EZ (skullcrusher — arco barra hacia atrás de la cabeza para mayor estiramiento), curl de tríceps tumbado (skull crusher con la barra yendo hasta el suelo). NOTA: en skullcrusher y aperturas con mancuerna (free weight), parar LIGERAMENTE antes del lockout = tensión constante (excepción válida a ROM completo, solo para pesos libres).
- A: Extensión overhead mancuerna un brazo, extensión en cable cruzado sobre el cuerpo (doble cable), press de tríceps en polea con barra (A tier, no llega a estiramiento máximo), dips agarre cerrado
- B: Rope pressdown (menos sobrecargable que barra), press francés con mancuerna (voluminosas al crecer), JM press
- C: Reverse grip pressdown

GEMELOS:
- Elevación de talones de pie con peso (gastroc — más responsivo al entrenamiento). Elevación de talones sentado (sóleo). Pausa 1s abajo, squeeze arriba. Drop set final -30-40%.

ABDOMEN:
- Dragon flags (fuerza core completa — favorito de Bruce Lee), crunch en cable, plancha con variaciones

CRITERIOS SIEMPRE: 1) Tensión alta en posición elongada 2) Sin dolor articular 3) Sobrecarga progresiva posible.

Peso siempre 0. Nombres de ejercicios en español.
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
