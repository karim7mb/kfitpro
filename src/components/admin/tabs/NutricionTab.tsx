import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Save, Image, Upload } from 'lucide-react'
import { supabase, fetchPlanNutricional, upsertPlanNutricional, fetchClienteData, fetchRegistrosPeso, fetchPerfilNutricional, type PlanNutricional, type ComidaPlan, type Alimento, type PerfilNutricional } from '../../../lib/supabase'

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined

const MEAL_EN: Record<string, string> = {
  desayuno: 'breakfast', almuerzo: 'lunch', comida: 'lunch',
  merienda: 'healthy snack', cena: 'dinner', preentrenamiento: 'pre workout meal',
  postentrenamiento: 'post workout meal',
}

const FOOD_EN: Record<string, string> = {
  avena: 'oatmeal', 'claras de huevo': 'egg white omelette', arándanos: 'blueberries',
  'pechuga de pollo': 'grilled chicken breast', 'arroz integral': 'brown rice',
  'verduras al vapor': 'steamed vegetables', 'batido de proteína': 'protein shake',
  manzana: 'apple', merluza: 'baked fish fillet', boniato: 'sweet potato',
  'ensalada verde': 'green salad', salmón: 'salmon fillet', brócoli: 'broccoli',
  'patata dulce': 'sweet potato', huevo: 'eggs', atún: 'tuna', ternera: 'beef',
  'arroz blanco': 'white rice', pasta: 'pasta', yogur: 'yogurt', plátano: 'banana',
  'nueces': 'walnuts', 'aguacate': 'avocado', espinacas: 'spinach',
}

function translateFood(nombre: string): string {
  const key = nombre.toLowerCase().trim()
  return FOOD_EN[key] ?? nombre
}

async function buscarFotoUnsplash(comida: ComidaPlan): Promise<string | { error: string }> {
  if (!UNSPLASH_KEY) return { error: 'Sin API key' }
  const nombreEn = MEAL_EN[comida.nombre.toLowerCase().trim()] ?? comida.nombre
  const mainEn = translateFood(comida.alimentos[0]?.nombre ?? '')
  const secondEn = translateFood(comida.alimentos[1]?.nombre ?? '')
  const isBowl = ['desayuno', 'merienda'].includes(comida.nombre.toLowerCase().trim())
  const style = isBowl ? 'bowl healthy nutrition fitness' : 'meal prep plate healthy fitness nutrition'
  const queries = [
    `${mainEn} ${secondEn} ${style}`,
    `${nombreEn} ${mainEn} healthy fitness food`,
    `${nombreEn} healthy fitness meal`,
  ]
  for (const q of queries) {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=6&orientation=landscape&client_id=${UNSPLASH_KEY}`
    )
    if (!res.ok) return { error: `HTTP ${res.status}` }
    const data = await res.json()
    const results: { urls: { regular: string } }[] = data.results ?? []
    if (results.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(results.length, 4))
      return results[idx].urls.regular
    }
  }
  return { error: 'Sin resultados' }
}

interface FoodResult {
  nombre: string
  cal100: number
  prot100: number
  carbs100: number
  fat100: number
}

// Curated Spanish fitness food database (macros per 100g)
const ALIMENTOS_DB: FoodResult[] = [
  // Proteínas animales
  { nombre: 'Pechuga de pollo', cal100: 110, prot100: 23, carbs100: 0, fat100: 2 },
  { nombre: 'Muslo de pollo', cal100: 177, prot100: 18, carbs100: 0, fat100: 12 },
  { nombre: 'Pavo (pechuga)', cal100: 107, prot100: 24, carbs100: 0, fat100: 1 },
  { nombre: 'Ternera magra', cal100: 150, prot100: 26, carbs100: 0, fat100: 5 },
  { nombre: 'Solomillo de ternera', cal100: 143, prot100: 22, carbs100: 0, fat100: 6 },
  { nombre: 'Cerdo lomo', cal100: 182, prot100: 22, carbs100: 0, fat100: 10 },
  { nombre: 'Salmón', cal100: 208, prot100: 20, carbs100: 0, fat100: 13 },
  { nombre: 'Atún en agua', cal100: 103, prot100: 23, carbs100: 0, fat100: 1 },
  { nombre: 'Atún fresco', cal100: 144, prot100: 24, carbs100: 0, fat100: 5 },
  { nombre: 'Merluza', cal100: 86, prot100: 18, carbs100: 0, fat100: 1 },
  { nombre: 'Bacalao', cal100: 82, prot100: 18, carbs100: 0, fat100: 1 },
  { nombre: 'Gambas', cal100: 85, prot100: 18, carbs100: 1, fat100: 1 },
  { nombre: 'Sardinas', cal100: 208, prot100: 25, carbs100: 0, fat100: 12 },
  { nombre: 'Huevo entero', cal100: 155, prot100: 13, carbs100: 1, fat100: 11 },
  { nombre: 'Claras de huevo', cal100: 52, prot100: 11, carbs100: 1, fat100: 0 },
  // Proteínas vegetales / lácteos
  { nombre: 'Proteína whey', cal100: 380, prot100: 75, carbs100: 8, fat100: 5 },
  { nombre: 'Yogur griego 0%', cal100: 57, prot100: 10, carbs100: 4, fat100: 0 },
  { nombre: 'Yogur griego natural', cal100: 97, prot100: 9, carbs100: 4, fat100: 5 },
  { nombre: 'Queso cottage', cal100: 98, prot100: 11, carbs100: 3, fat100: 4 },
  { nombre: 'Requesón', cal100: 74, prot100: 8, carbs100: 4, fat100: 3 },
  { nombre: 'Leche desnatada', cal100: 35, prot100: 4, carbs100: 5, fat100: 0 },
  { nombre: 'Leche semidesnatada', cal100: 47, prot100: 3, carbs100: 5, fat100: 2 },
  { nombre: 'Tofu', cal100: 76, prot100: 8, carbs100: 2, fat100: 4 },
  { nombre: 'Edamame', cal100: 122, prot100: 11, carbs100: 10, fat100: 5 },
  { nombre: 'Legumbres cocidas (lentejas)', cal100: 116, prot100: 9, carbs100: 20, fat100: 1 },
  { nombre: 'Legumbres cocidas (garbanzos)', cal100: 164, prot100: 9, carbs100: 27, fat100: 3 },
  // Carbohidratos
  { nombre: 'Arroz blanco cocido', cal100: 130, prot100: 3, carbs100: 28, fat100: 0 },
  { nombre: 'Arroz integral cocido', cal100: 123, prot100: 3, carbs100: 26, fat100: 1 },
  { nombre: 'Avena en copos', cal100: 370, prot100: 13, carbs100: 60, fat100: 7 },
  { nombre: 'Pasta cocida', cal100: 131, prot100: 5, carbs100: 25, fat100: 1 },
  { nombre: 'Pasta integral cocida', cal100: 124, prot100: 5, carbs100: 23, fat100: 1 },
  { nombre: 'Patata cocida', cal100: 87, prot100: 2, carbs100: 20, fat100: 0 },
  { nombre: 'Patata dulce / Boniato', cal100: 86, prot100: 2, carbs100: 20, fat100: 0 },
  { nombre: 'Pan integral', cal100: 247, prot100: 9, carbs100: 46, fat100: 3 },
  { nombre: 'Pan blanco', cal100: 265, prot100: 8, carbs100: 52, fat100: 2 },
  { nombre: 'Tortita de arroz', cal100: 387, prot100: 8, carbs100: 82, fat100: 3 },
  { nombre: 'Quinoa cocida', cal100: 120, prot100: 4, carbs100: 22, fat100: 2 },
  { nombre: 'Couscous cocido', cal100: 112, prot100: 4, carbs100: 23, fat100: 0 },
  // Verduras
  { nombre: 'Brócoli', cal100: 34, prot100: 3, carbs100: 7, fat100: 0 },
  { nombre: 'Espinacas', cal100: 23, prot100: 3, carbs100: 4, fat100: 0 },
  { nombre: 'Lechuga', cal100: 15, prot100: 1, carbs100: 2, fat100: 0 },
  { nombre: 'Tomate', cal100: 18, prot100: 1, carbs100: 4, fat100: 0 },
  { nombre: 'Pepino', cal100: 15, prot100: 1, carbs100: 4, fat100: 0 },
  { nombre: 'Pimiento rojo', cal100: 31, prot100: 1, carbs100: 6, fat100: 0 },
  { nombre: 'Zanahoria', cal100: 41, prot100: 1, carbs100: 10, fat100: 0 },
  { nombre: 'Calabacín', cal100: 17, prot100: 1, carbs100: 3, fat100: 0 },
  { nombre: 'Champiñones', cal100: 22, prot100: 3, carbs100: 3, fat100: 0 },
  { nombre: 'Cebolla', cal100: 40, prot100: 1, carbs100: 9, fat100: 0 },
  { nombre: 'Espárragos', cal100: 20, prot100: 2, carbs100: 4, fat100: 0 },
  { nombre: 'Col (repollo)', cal100: 25, prot100: 1, carbs100: 6, fat100: 0 },
  { nombre: 'Ensalada mixta', cal100: 15, prot100: 1, carbs100: 2, fat100: 0 },
  { nombre: 'Verduras al vapor', cal100: 30, prot100: 2, carbs100: 6, fat100: 0 },
  // Frutas
  { nombre: 'Plátano', cal100: 89, prot100: 1, carbs100: 23, fat100: 0 },
  { nombre: 'Manzana', cal100: 52, prot100: 0, carbs100: 14, fat100: 0 },
  { nombre: 'Naranja', cal100: 47, prot100: 1, carbs100: 12, fat100: 0 },
  { nombre: 'Fresas', cal100: 32, prot100: 1, carbs100: 8, fat100: 0 },
  { nombre: 'Arándanos', cal100: 57, prot100: 1, carbs100: 14, fat100: 0 },
  { nombre: 'Kiwi', cal100: 61, prot100: 1, carbs100: 15, fat100: 1 },
  { nombre: 'Sandía', cal100: 30, prot100: 1, carbs100: 8, fat100: 0 },
  { nombre: 'Melocotón', cal100: 39, prot100: 1, carbs100: 10, fat100: 0 },
  { nombre: 'Pera', cal100: 57, prot100: 0, carbs100: 15, fat100: 0 },
  { nombre: 'Uvas', cal100: 69, prot100: 1, carbs100: 18, fat100: 0 },
  // Grasas saludables
  { nombre: 'Aguacate', cal100: 160, prot100: 2, carbs100: 9, fat100: 15 },
  { nombre: 'Aceite de oliva', cal100: 884, prot100: 0, carbs100: 0, fat100: 100 },
  { nombre: 'Nueces', cal100: 654, prot100: 15, carbs100: 14, fat100: 65 },
  { nombre: 'Almendras', cal100: 579, prot100: 21, carbs100: 22, fat100: 50 },
  { nombre: 'Mantequilla de cacahuete', cal100: 588, prot100: 25, carbs100: 20, fat100: 50 },
  { nombre: 'Semillas de chía', cal100: 486, prot100: 17, carbs100: 42, fat100: 31 },
  { nombre: 'Aceite de coco', cal100: 862, prot100: 0, carbs100: 0, fat100: 100 },
]

function searchLocalFoods(query: string): FoodResult[] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []
  return ALIMENTOS_DB.filter(f => f.nombre.toLowerCase().includes(q)).slice(0, 6)
}

async function searchOpenFoodFacts(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=product_name%2Cnutriments&page_size=10&sort_by=unique_scans_n&lc=es&cc=es`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const out: FoodResult[] = []
    for (const p of data.products ?? []) {
      const name = (p.product_name ?? '').trim()
      if (!name) continue
      const n = p.nutriments ?? {}
      const cal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? Math.round(n['energy_100g'] / 4.184) : 0)
      const prot = n['proteins_100g'] ?? 0
      const carbs = n['carbohydrates_100g'] ?? 0
      const fat = n['fat_100g'] ?? 0
      if (cal === 0 && prot === 0) continue
      out.push({ nombre: name, cal100: Math.round(cal), prot100: Math.round(prot), carbs100: Math.round(carbs), fat100: Math.round(fat) })
      if (out.length >= 4) break
    }
    return out
  } catch {
    return []
  }
}

async function searchFoods(query: string): Promise<FoodResult[] | { error: string }> {
  const local = searchLocalFoods(query)
  if (local.length >= 4) return local
  try {
    const off = await searchOpenFoodFacts(query)
    const localNames = new Set(local.map(f => f.nombre.toLowerCase()))
    const extra = off.filter(f => !localNames.has(f.nombre.toLowerCase()))
    return [...local, ...extra].slice(0, 6)
  } catch (e) {
    if (local.length > 0) return local
    return { error: e instanceof Error ? e.message : 'Error de red' }
  }
}

// ─── Plan Generator ───────────────────────────────────────────────────────────
type Objetivo = 'definicion' | 'volumen' | 'mantenimiento' | 'perdida'

const MACRO_SPLITS: Record<Objetivo, [number, number, number]> = {
  definicion:    [0.40, 0.35, 0.25],
  volumen:       [0.30, 0.50, 0.20],
  mantenimiento: [0.30, 0.45, 0.25],
  perdida:       [0.42, 0.28, 0.30],
}

const MEAL_TEMPLATES: Record<number, { nombre: string; hora: string; pct: number; tipo: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'snack' }[]> = {
  3: [
    { nombre: 'Desayuno', hora: '08:00', pct: 0.30, tipo: 'desayuno' },
    { nombre: 'Almuerzo', hora: '14:00', pct: 0.42, tipo: 'almuerzo' },
    { nombre: 'Cena',     hora: '21:00', pct: 0.28, tipo: 'cena' },
  ],
  4: [
    { nombre: 'Desayuno', hora: '08:00', pct: 0.25, tipo: 'desayuno' },
    { nombre: 'Almuerzo', hora: '13:00', pct: 0.35, tipo: 'almuerzo' },
    { nombre: 'Merienda', hora: '17:00', pct: 0.15, tipo: 'merienda' },
    { nombre: 'Cena',     hora: '21:00', pct: 0.25, tipo: 'cena' },
  ],
  5: [
    { nombre: 'Desayuno',       hora: '08:00', pct: 0.20, tipo: 'desayuno' },
    { nombre: 'Almuerzo',       hora: '13:00', pct: 0.30, tipo: 'almuerzo' },
    { nombre: 'Merienda',       hora: '17:00', pct: 0.15, tipo: 'merienda' },
    { nombre: 'Cena',           hora: '20:30', pct: 0.25, tipo: 'cena' },
    { nombre: 'Pre-entreno',    hora: '19:00', pct: 0.10, tipo: 'snack' },
  ],
}

const PROT_MORNING  = ['Claras de huevo', 'Huevo entero', 'Yogur griego 0%', 'Proteína whey', 'Requesón', 'Queso cottage']
const PROT_MAIN     = ['Pechuga de pollo', 'Pavo (pechuga)', 'Salmón', 'Atún en agua', 'Merluza', 'Ternera magra', 'Gambas']
const CARB_MORNING  = ['Avena en copos', 'Pan integral', 'Tortita de arroz']
const CARB_MAIN     = ['Arroz integral cocido', 'Arroz blanco cocido', 'Patata cocida', 'Pasta cocida', 'Patata dulce / Boniato', 'Quinoa cocida']
const VEGETALES     = ['Brócoli', 'Espinacas', 'Verduras al vapor', 'Ensalada mixta', 'Calabacín', 'Champiñones']
const FRUTAS        = ['Plátano', 'Manzana', 'Fresas', 'Arándanos', 'Naranja', 'Kiwi']

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function dbFood(nombre: string): FoodResult { return ALIMENTOS_DB.find(f => f.nombre === nombre) ?? ALIMENTOS_DB[0] }

function makeAlimento(food: FoodResult, gramos: number): Omit<Alimento, 'id'> {
  const f = gramos / 100
  return { nombre: food.nombre, gramos, calorias: Math.round(food.cal100 * f), proteinas: Math.round(food.prot100 * f), carbos: Math.round(food.carbs100 * f), grasas: Math.round(food.fat100 * f) }
}

function gramsForProt(targetProt: number, food: FoodResult): number {
  return Math.max(25, Math.round((targetProt * 100 / Math.max(food.prot100, 1)) / 25) * 25)
}
function gramsForCarbs(targetCarbs: number, food: FoodResult): number {
  return Math.max(25, Math.round((targetCarbs * 100 / Math.max(food.carbs100, 1)) / 25) * 25)
}

function generateMealFoods(tipo: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'snack', targetProt: number, targetCarbs: number, objetivo: Objetivo): Alimento[] {
  const mk = (f: FoodResult, g: number): Alimento => ({ id: Math.random().toString(36).slice(2), ...makeAlimento(f, g) })

  if (tipo === 'desayuno') {
    const pf = dbFood(pickRandom(PROT_MORNING))
    const cf = dbFood(pickRandom(CARB_MORNING))
    const ff = dbFood(pickRandom(FRUTAS))
    const protGrams = pf.nombre === 'Proteína whey'
      ? 40
      : gramsForProt(targetProt * 0.75, pf)
    return [
      mk(pf, protGrams),
      mk(cf, gramsForCarbs(targetCarbs * 0.80, cf)),
      mk(ff, 100),
    ]
  }
  if (tipo === 'almuerzo' || tipo === 'cena') {
    const pf = dbFood(pickRandom(PROT_MAIN))
    const vf = dbFood(pickRandom(VEGETALES))
    const skipCarbs = tipo === 'cena' && (objetivo === 'definicion' || objetivo === 'perdida')
    const items: Alimento[] = [
      mk(pf, Math.max(gramsForProt(targetProt * 0.85, pf), 100)),
      mk(vf, 150),
    ]
    if (!skipCarbs) {
      const cf = dbFood(pickRandom(CARB_MAIN))
      items.splice(1, 0, mk(cf, gramsForCarbs(targetCarbs * 0.85, cf)))
    }
    return items
  }
  if (tipo === 'merienda') {
    const useShake = Math.random() > 0.5
    const pf = dbFood(useShake ? 'Proteína whey' : 'Yogur griego 0%')
    const ff = dbFood(pickRandom(FRUTAS))
    return [mk(pf, useShake ? 35 : 150), mk(ff, 150)]
  }
  // snack / pre-entreno
  const cf = dbFood(pickRandom(['Plátano', 'Tortita de arroz', 'Avena en copos']))
  return [mk(cf, cf.nombre === 'Avena en copos' ? 50 : 100)]
}

type Actividad = 'sedentario' | 'ligero' | 'moderado' | 'activo'

const ACTIVIDAD_MULT: Record<Actividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
}

const OBJ_ADJ: Record<Objetivo, number> = {
  mantenimiento: 0,
  definicion: -400,
  volumen: 400,
  perdida: -600,
}

function calcTDEE(sexo: 'hombre' | 'mujer', peso: number, altura: number, edad: number, actividad: Actividad, objetivo: Objetivo): number {
  const bmr = sexo === 'hombre'
    ? 10 * peso + 6.25 * altura - 5 * edad + 5
    : 10 * peso + 6.25 * altura - 5 * edad - 161
  const tdee = bmr * ACTIVIDAD_MULT[actividad]
  return Math.round((tdee + OBJ_ADJ[objetivo]) / 50) * 50
}

const VEGS_SET = new Set(['Brócoli', 'Espinacas', 'Verduras al vapor', 'Ensalada mixta', 'Calabacín', 'Champiñones', 'Lechuga'])
const MAX_GRAMS: Record<string, number> = {
  'Proteína whey': 50, 'Aceite de oliva': 30,
}
const DEFAULT_MAX = 300

function scaleMealToCalories(alimentos: Alimento[], targetCal: number): Alimento[] {
  const actualCal = alimentos.reduce((s, a) => s + a.calorias, 0)
  if (actualCal === 0) return alimentos
  const ratio = targetCal / actualCal
  if (ratio > 0.90 && ratio < 1.12) return alimentos

  // Scale non-vegetable foods proportionally with per-food caps
  const scaled = alimentos.map(a => {
    if (VEGS_SET.has(a.nombre)) return a
    const cap = MAX_GRAMS[a.nombre] ?? DEFAULT_MAX
    const newGrams = Math.min(cap, Math.round((a.gramos * ratio) / 25) * 25)
    const food = ALIMENTOS_DB.find(x => x.nombre === a.nombre)
    if (!food) return a
    const f = newGrams / 100
    return { ...a, gramos: newGrams, calorias: Math.round(food.cal100 * f), proteinas: Math.round(food.prot100 * f), carbos: Math.round(food.carbs100 * f), grasas: Math.round(food.fat100 * f) }
  })

  // If still below target by >12%, add olive oil to cover the gap
  const scaledCal = scaled.reduce((s, a) => s + a.calorias, 0)
  if (scaledCal < targetCal * 0.88) {
    const oilGrams = Math.min(30, Math.round(((targetCal - scaledCal) * 100 / 884) / 5) * 5)
    if (oilGrams >= 5) {
      const f = oilGrams / 100
      scaled.push({ id: Math.random().toString(36).slice(2), nombre: 'Aceite de oliva', gramos: oilGrams, calorias: Math.round(884 * f), proteinas: 0, carbos: 0, grasas: Math.round(100 * f) })
    }
  }
  return scaled
}

async function generatePlanWithGroq(
  sexo: 'hombre' | 'mujer', edad: number, peso: number, altura: number,
  actividad: Actividad, objetivo: Objetivo, calorias: number, numComidas: number,
  clienteId: string, entrenadorId: string,
  perfilNutricional?: PerfilNutricional | null
): Promise<PlanNutricional> {
  const [pPct, cPct] = MACRO_SPLITS[objetivo]
  const protG  = Math.round((calorias * pPct) / 4)
  const carbsG = Math.round((calorias * cPct) / 4)
  const fatG   = Math.round((calorias * (1 - pPct - cPct)) / 9)

  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sexo, edad, peso, altura, actividad, objetivo, calorias, numComidas, protG, carbsG, fatG, perfilNutricional }),
  })

  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`)

  type RawMeal = { nombre: string; hora: string; alimentos: { nombre: string; gramos: number; calorias: number; proteinas: number; carbos: number; grasas: number }[] }
  const mealData: RawMeal[] = data.comidas

  const planLabels: Record<Objetivo, string> = { definicion: 'Definición', volumen: 'Volumen', mantenimiento: 'Mantenimiento', perdida: 'Pérdida de grasa' }
  return {
    cliente_id: clienteId,
    entrenador_id: entrenadorId,
    nombre: `Plan IA ${planLabels[objetivo]} — ${calorias} kcal`,
    calorias_objetivo: calorias,
    proteinas_g: protG,
    carbos_g: carbsG,
    grasas_g: fatG,
    comidas: mealData.map(m => ({
      id: Math.random().toString(36).slice(2),
      nombre: m.nombre,
      hora: m.hora,
      alimentos: m.alimentos.map(a => ({ id: Math.random().toString(36).slice(2), ...a })),
    })),
  }
}

function runGenerator(objetivo: Objetivo, calorias: number, numComidas: number, clienteId: string, entrenadorId: string): PlanNutricional {
  const [pPct, cPct] = MACRO_SPLITS[objetivo]
  const fPct = 1 - pPct - cPct
  const totalProt  = Math.round((calorias * pPct) / 4)
  const totalCarbs = Math.round((calorias * cPct) / 4)
  const totalFat   = Math.round((calorias * fPct) / 9)

  const templates = MEAL_TEMPLATES[numComidas] ?? MEAL_TEMPLATES[4]
  const comidas: ComidaPlan[] = templates.map(t => {
    const mealCal = Math.round(calorias * t.pct)
    const raw = generateMealFoods(t.tipo, Math.round(totalProt * t.pct), Math.round(totalCarbs * t.pct), objetivo)
    return {
      id: Math.random().toString(36).slice(2),
      nombre: t.nombre,
      hora: t.hora,
      alimentos: scaleMealToCalories(raw, mealCal),
    }
  })

  const labels: Record<Objetivo, string> = { definicion: 'Definición', volumen: 'Volumen', mantenimiento: 'Mantenimiento', perdida: 'Pérdida de grasa' }
  return { cliente_id: clienteId, entrenador_id: entrenadorId, nombre: `Plan ${labels[objetivo]} — ${calorias} kcal`, calorias_objetivo: calorias, proteinas_g: totalProt, carbos_g: totalCarbs, grasas_g: totalFat, comidas }
}
// ──────────────────────────────────────────────────────────────────────────────

interface NutricionTabProps {
  clientId: string
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

const isDemo = (id: string) => id.startsWith('client-') || id.startsWith('admin-')

function uid() { return Math.random().toString(36).slice(2) }

const COMIDAS_DEFAULT = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']

const EMPTY_PLAN = (clienteId: string, entrenadorId: string): PlanNutricional => ({
  cliente_id: clienteId,
  entrenador_id: entrenadorId,
  nombre: 'Plan Nutricional',
  calorias_objetivo: 2000,
  proteinas_g: 150,
  carbos_g: 220,
  grasas_g: 70,
  comidas: COMIDAS_DEFAULT.map((nombre, i) => ({
    id: uid(),
    nombre,
    hora: ['08:00', '13:00', '17:00', '21:00'][i],
    alimentos: [],
  })),
})

export default function NutricionTab({ clientId, onToast }: NutricionTabProps) {
  const demo = isDemo(clientId)
  const [plan, setPlan] = useState<PlanNutricional | null>(null)
  const [loading, setLoading] = useState(!demo)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newFood, setNewFood] = useState({ nombre: '', gramos: '', calorias: '', proteinas: '', carbos: '', grasas: '' })
  const [searchingFoto, setSearchingFoto] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null)
  const [pendingUploadMealId, setPendingUploadMealId] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [genObjetivo, setGenObjetivo] = useState<Objetivo>('definicion')
  const [genCalorias, setGenCalorias] = useState(2000)
  const [genComidas, setGenComidas] = useState(4)
  const [genSexo, setGenSexo] = useState<'hombre' | 'mujer'>('hombre')
  const [genAltura, setGenAltura] = useState(175)
  const [genPeso, setGenPeso] = useState(75)
  const [genEdad, setGenEdad] = useState(25)
  const [genActividad, setGenActividad] = useState<Actividad>('moderado')
  const [genManual, setGenManual] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [foodQuery, setFoodQuery] = useState('')
  const [foodResults, setFoodResults] = useState<FoodResult[]>([])
  const [foodSearching, setFoodSearching] = useState(false)
  const [foodError, setFoodError] = useState<string | null>(null)
  const [showFoodDrop, setShowFoodDrop] = useState(false)
  const [selectedFoodBase, setSelectedFoodBase] = useState<FoodResult | null>(null)

  useEffect(() => {
    setFoodQuery('')
    setFoodResults([])
    setShowFoodDrop(false)
    setSelectedFoodBase(null)
    setFoodError(null)
  }, [addingTo])

  useEffect(() => {
    if (!foodQuery || foodQuery.length < 2) { setFoodResults([]); setShowFoodDrop(false); setFoodError(null); return }
    const timer = setTimeout(async () => {
      setFoodSearching(true)
      setFoodError(null)
      const res = await searchFoods(foodQuery)
      if (Array.isArray(res)) {
        setFoodResults(res)
        setShowFoodDrop(true)
        if (res.length === 0) setFoodError('Sin resultados — introduce los macros manualmente')
      } else {
        setFoodError(`Error: ${res.error}`)
        setFoodResults([])
        setShowFoodDrop(false)
      }
      setFoodSearching(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [foodQuery])

  useEffect(() => {
    if (!showGenerator) return
    fetchClienteData(clientId).then(c => {
      if (!c) return
      if (c.edad) setGenEdad(c.edad)
      if (c.pesoInicial) setGenPeso(c.pesoInicial)
    })
    fetchRegistrosPeso(clientId).then(pesos => {
      if (pesos.length > 0) setGenPeso(pesos[pesos.length - 1].peso)
    })
  }, [showGenerator, clientId])

  useEffect(() => {
    if (!genManual) setGenCalorias(calcTDEE(genSexo, genPeso, genAltura, genEdad, genActividad, genObjetivo))
  }, [genSexo, genPeso, genAltura, genEdad, genActividad, genObjetivo, genManual])

  useEffect(() => {
    if (demo) return
    fetchPlanNutricional(clientId).then(p => {
      setPlan(p)
      setLoading(false)
    })
  }, [clientId, demo])

  const initPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setPlan(EMPTY_PLAN(clientId, user.id))
  }

  const save = async () => {
    if (!plan) return
    setSaving(true)
    try {
      await upsertPlanNutricional(plan)
      onToast('Plan guardado', 'success')
    } catch {
      onToast('Error al guardar el plan', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateMacro = (field: keyof PlanNutricional, value: number) => {
    setPlan(p => p ? { ...p, [field]: value } : p)
  }

  const addComida = () => {
    setPlan(p => p ? { ...p, comidas: [...p.comidas, { id: uid(), nombre: 'Nueva comida', hora: '00:00', alimentos: [] }] } : p)
  }

  const removeComida = (cId: string) => {
    setPlan(p => p ? { ...p, comidas: p.comidas.filter(c => c.id !== cId) } : p)
  }

  const updateComida = (cId: string, field: keyof ComidaPlan, value: string) => {
    setPlan(p => p ? { ...p, comidas: p.comidas.map(c => c.id === cId ? { ...c, [field]: value } : c) } : p)
  }

  const handleBuscarFoto = async (comida: ComidaPlan) => {
    setSearchingFoto(comida.id)
    try {
      const result = await buscarFotoUnsplash(comida)
      if (typeof result === 'string') {
        updateComida(comida.id, 'foto_url', result)
      } else {
        onToast(`Error Unsplash: ${result.error}`, 'error')
      }
    } catch (e) {
      onToast(`Error: ${e instanceof Error ? e.message : 'desconocido'}`, 'error')
    } finally {
      setSearchingFoto(null)
    }
  }

  const handleUploadFoto = (comidaId: string) => {
    setPendingUploadMealId(comidaId)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !pendingUploadMealId) return
    const mealId = pendingUploadMealId
    setPendingUploadMealId(null)
    setUploadingFoto(mealId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sin sesión')
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/meal-${mealId}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('progress-photos').getPublicUrl(path)
      updateComida(mealId, 'foto_url', data.publicUrl)
      onToast('Foto subida correctamente', 'success')
    } catch (err) {
      onToast(`Error al subir foto: ${err instanceof Error ? err.message : 'desconocido'}`, 'error')
    } finally {
      setUploadingFoto(null)
    }
  }

  const addAlimento = (cId: string) => {
    const a: Alimento = {
      id: uid(),
      nombre: newFood.nombre || 'Alimento',
      gramos: Number(newFood.gramos) || 0,
      calorias: Number(newFood.calorias) || 0,
      proteinas: Number(newFood.proteinas) || 0,
      carbos: Number(newFood.carbos) || 0,
      grasas: Number(newFood.grasas) || 0,
    }
    setPlan(p => p ? { ...p, comidas: p.comidas.map(c => c.id === cId ? { ...c, alimentos: [...c.alimentos, a] } : c) } : p)
    setNewFood({ nombre: '', gramos: '', calorias: '', proteinas: '', carbos: '', grasas: '' })
    setAddingTo(null)
  }

  const removeAlimento = (cId: string, aId: string) => {
    setPlan(p => p ? { ...p, comidas: p.comidas.map(c => c.id === cId ? { ...c, alimentos: c.alimentos.filter(a => a.id !== aId) } : c) } : p)
  }

  const totalCal = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.calorias, 0), 0) ?? 0
  const totalProt = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.proteinas, 0), 0) ?? 0
  const totalCarbs = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.carbos, 0), 0) ?? 0
  const totalGrasas = plan?.comidas.reduce((s, c) => s + c.alimentos.reduce((ss, a) => ss + a.grasas, 0), 0) ?? 0

  if (demo) return (
    <div className="rounded-xl p-8 text-center" style={{ background: '#161820', border: '1px solid #1E2130' }}>
      <p className="text-white font-medium">Plan nutricional</p>
      <p className="text-sm mt-1" style={{ color: '#6B7280' }}>No disponible en modo demo</p>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#F5611A' }} />
    </div>
  )

  if (!plan) return (
    <div className="rounded-xl p-10 flex flex-col items-center gap-4 text-center" style={{ background: '#161820', border: '1px solid #1E2130' }}>
      <div className="text-4xl">🥗</div>
      <div>
        <p className="font-bold text-white">Sin plan nutricional</p>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Crea el plan de alimentación personalizado para este cliente</p>
      </div>
      <button onClick={initPlan} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer" style={{ background: '#F5611A' }}>
        Crear plan nutricional
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <input
            value={plan.nombre}
            onChange={e => setPlan(p => p ? { ...p, nombre: e.target.value } : p)}
            className="font-bold text-white text-lg bg-transparent outline-none border-b border-transparent focus:border-orange-500 w-full"
          />
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Calorías totales del plan: <span className="text-white font-medium">{totalCal} kcal</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowShoppingList(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e' }}
          >
            🛒 Lista compra
          </button>
          <button
            onClick={() => { setGenCalorias(plan.calorias_objetivo); setShowGenerator(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ background: '#1E2130', color: '#9CA3AF', border: '1px solid #2a2d3e' }}
          >
            ✨ Generar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#F5611A', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Save style={{ width: 14, height: 14 }} />}
            Guardar
          </button>
        </div>
      </div>

      {/* Objetivos macro */}
      <div className="rounded-xl p-5" style={{ background: '#161820', border: '1px solid #1E2130' }}>
        <h3 className="font-semibold text-white mb-4">Objetivos diarios</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Calorías', field: 'calorias_objetivo' as const, unit: 'kcal', color: '#F5611A', val: plan.calorias_objetivo, real: totalCal },
            { label: 'Proteínas', field: 'proteinas_g' as const, unit: 'g', color: '#8B5CF6', val: plan.proteinas_g, real: totalProt },
            { label: 'Carbohidratos', field: 'carbos_g' as const, unit: 'g', color: '#3B82F6', val: plan.carbos_g, real: totalCarbs },
            { label: 'Grasas', field: 'grasas_g' as const, unit: 'g', color: '#F59E0B', val: plan.grasas_g, real: totalGrasas },
          ].map(({ label, field, unit, color, val, real }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: '#1E2130' }}>
              <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</div>
              <div className="flex items-center gap-1 mb-1">
                <input
                  type="number"
                  value={val}
                  onChange={e => updateMacro(field, Number(e.target.value))}
                  className="w-16 text-lg font-bold bg-transparent outline-none"
                  style={{ color }}
                />
                <span className="text-xs" style={{ color: '#4B5563' }}>{unit}</span>
              </div>
              <div className="text-xs" style={{ color: '#4B5563' }}>Plan: {real} {unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comidas */}
      <div className="space-y-3">
        {plan.comidas.map(comida => {
          const calComida = comida.alimentos.reduce((s, a) => s + a.calorias, 0)
          const isOpen = expanded[comida.id] ?? true
          return (
            <div key={comida.id} className="rounded-xl" style={{ background: '#161820', border: '1px solid #1E2130' }}>
              <div className="px-4 py-3 flex items-center gap-3">
                <button onClick={() => setExpanded(p => ({ ...p, [comida.id]: !isOpen }))} className="cursor-pointer">
                  {isOpen ? <ChevronUp style={{ width: 16, height: 16, color: '#6B7280' }} /> : <ChevronDown style={{ width: 16, height: 16, color: '#6B7280' }} />}
                </button>
                <input
                  value={comida.nombre}
                  onChange={e => updateComida(comida.id, 'nombre', e.target.value)}
                  className="flex-1 font-semibold text-white bg-transparent outline-none text-sm"
                />
                <input
                  value={comida.hora}
                  onChange={e => updateComida(comida.id, 'hora', e.target.value)}
                  className="w-14 text-xs text-center bg-transparent outline-none rounded px-1 py-0.5"
                  style={{ color: '#6B7280', border: '1px solid #2a2d3e' }}
                />
                <span className="text-xs font-medium" style={{ color: '#F5611A' }}>{calComida} kcal</span>
                <button
                  onClick={() => handleUploadFoto(comida.id)}
                  disabled={uploadingFoto === comida.id}
                  className="cursor-pointer"
                  title="Subir foto desde dispositivo"
                  style={{ color: comida.foto_url ? '#10B981' : '#4B5563' }}
                >
                  {uploadingFoto === comida.id
                    ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                    : <Upload style={{ width: 14, height: 14 }} />}
                </button>
                {UNSPLASH_KEY && (
                  <button
                    onClick={() => handleBuscarFoto(comida)}
                    disabled={searchingFoto === comida.id}
                    className="cursor-pointer"
                    title="Buscar foto automática (Unsplash)"
                    style={{ color: '#4B5563' }}
                  >
                    {searchingFoto === comida.id
                      ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                      : <Image style={{ width: 14, height: 14 }} />}
                  </button>
                )}
                <button onClick={() => removeComida(comida.id)} className="cursor-pointer" style={{ color: '#4B5563' }}>
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
              {comida.foto_url && isOpen && (
                <div className="px-4 pb-3">
                  <div className="relative rounded-xl overflow-hidden" style={{ height: 120 }}>
                    <img
                      src={comida.foto_url}
                      alt={comida.nombre}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightboxUrl(comida.foto_url!)}
                    />
                    <button
                      onClick={() => updateComida(comida.id, 'foto_url', '')}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer font-bold"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                    >×</button>
                    <button
                      onClick={() => handleBuscarFoto(comida)}
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-lg text-xs cursor-pointer font-medium"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                    >Cambiar</button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="px-4 pb-3">
                  {/* Alimentos */}
                  {comida.alimentos.length > 0 && (
                    <div className="mb-2">
                      <div className="grid text-xs mb-1 px-2" style={{ gridTemplateColumns: '1fr 60px 60px 50px 50px 50px 28px', color: '#4B5563' }}>
                        <span>Alimento</span><span className="text-center">g</span><span className="text-center">kcal</span>
                        <span className="text-center">prot</span><span className="text-center">carbs</span><span className="text-center">grasas</span><span />
                      </div>
                      {comida.alimentos.map(a => (
                        <div key={a.id} className="grid items-center text-xs py-1.5 px-2 rounded-lg mb-1" style={{ gridTemplateColumns: '1fr 60px 60px 50px 50px 50px 28px', background: '#1E2130' }}>
                          <span className="text-white truncate">{a.nombre}</span>
                          <span className="text-center" style={{ color: '#9CA3AF' }}>{a.gramos}</span>
                          <span className="text-center font-medium" style={{ color: '#F5611A' }}>{a.calorias}</span>
                          <span className="text-center" style={{ color: '#8B5CF6' }}>{a.proteinas}g</span>
                          <span className="text-center" style={{ color: '#3B82F6' }}>{a.carbos}g</span>
                          <span className="text-center" style={{ color: '#F59E0B' }}>{a.grasas}g</span>
                          <button onClick={() => removeAlimento(comida.id, a.id)} className="cursor-pointer flex justify-center" style={{ color: '#4B5563' }}>
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add food form */}
                  {addingTo === comida.id ? (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}>
                      {/* Food name with autocomplete */}
                      <div className="relative">
                        <div className="relative">
                          <input
                            placeholder="Buscar alimento (ej: pollo, avena, arroz...)"
                            value={newFood.nombre}
                            onChange={e => {
                              setNewFood(p => ({ ...p, nombre: e.target.value }))
                              setFoodQuery(e.target.value)
                              setSelectedFoodBase(null)
                            }}
                            onFocus={() => { if (foodResults.length > 0) setShowFoodDrop(true) }}
                            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none pr-8"
                            style={{ background: '#0D0E13', border: '1px solid #2a2d3e' }}
                          />
                          {foodSearching && (
                            <Loader2 className="animate-spin absolute right-2.5 top-2.5" style={{ width: 14, height: 14, color: '#6B7280' }} />
                          )}
                          {selectedFoodBase && !foodSearching && (
                            <span className="absolute right-2.5 top-2.5 text-xs" style={{ color: '#10B981' }}>✓</span>
                          )}
                        </div>
                        {foodSearching && (
                          <p className="text-xs mt-1 px-1" style={{ color: '#6B7280' }}>Buscando en base de datos...</p>
                        )}
                        {!foodSearching && foodError && (
                          <p className="text-xs mt-1 px-1" style={{ color: '#F59E0B' }}>{foodError}</p>
                        )}
                        {showFoodDrop && foodResults.length > 0 && (
                          <div className="absolute z-30 w-full mt-1 rounded-xl overflow-hidden shadow-xl" style={{ background: '#0D0E13', border: '1px solid #2a2d3e' }}>
                            {foodResults.map((f, i) => (
                              <button
                                key={i}
                                onMouseDown={e => {
                                  e.preventDefault()
                                  const g = Number(newFood.gramos) || 100
                                  const factor = g / 100
                                  setNewFood(p => ({
                                    ...p,
                                    nombre: f.nombre,
                                    calorias: String(Math.round(f.cal100 * factor)),
                                    proteinas: String(Math.round(f.prot100 * factor)),
                                    carbos: String(Math.round(f.carbs100 * factor)),
                                    grasas: String(Math.round(f.fat100 * factor)),
                                  }))
                                  setSelectedFoodBase(f)
                                  setShowFoodDrop(false)
                                }}
                                className="w-full px-3 py-2 text-left transition-colors"
                                style={{ borderBottom: i < foodResults.length - 1 ? '1px solid #1a1d2e' : 'none' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#1E2130')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <div className="text-sm text-white truncate">{f.nombre}</div>
                                <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                                  {f.cal100} kcal · {f.prot100}g prot · {f.carbs100}g carbs · {f.fat100}g grasas
                                  <span className="ml-1" style={{ color: '#4B5563' }}>(por 100g)</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { key: 'gramos', label: 'g' },
                          { key: 'calorias', label: 'kcal' },
                          { key: 'proteinas', label: 'prot' },
                          { key: 'carbos', label: 'carbs' },
                          { key: 'grasas', label: 'grasas' },
                        ].map(({ key, label }) => (
                          <input
                            key={key}
                            type="number"
                            placeholder={label}
                            value={newFood[key as keyof typeof newFood]}
                            onChange={e => {
                              const val = e.target.value
                              if (key === 'gramos' && selectedFoodBase) {
                                const g = Number(val) || 0
                                const factor = g / 100
                                setNewFood(p => ({
                                  ...p,
                                  gramos: val,
                                  calorias: String(Math.round(selectedFoodBase.cal100 * factor)),
                                  proteinas: String(Math.round(selectedFoodBase.prot100 * factor)),
                                  carbos: String(Math.round(selectedFoodBase.carbs100 * factor)),
                                  grasas: String(Math.round(selectedFoodBase.fat100 * factor)),
                                }))
                              } else {
                                setNewFood(p => ({ ...p, [key]: val }))
                              }
                            }}
                            className="px-2 py-1.5 rounded-lg text-xs text-white outline-none text-center"
                            style={{
                              background: '#0D0E13',
                              border: `1px solid ${key !== 'gramos' && selectedFoodBase ? '#1E3A2F' : '#2a2d3e'}`,
                              color: key !== 'gramos' && selectedFoodBase ? '#10B981' : 'white',
                            }}
                          />
                        ))}
                      </div>
                      {selectedFoodBase && (
                        <p className="text-xs" style={{ color: '#4B5563' }}>
                          Macros calculados automáticamente. Cambia los gramos para recalcular.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => addAlimento(comida.id)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer" style={{ background: '#F5611A' }}>
                          Añadir
                        </button>
                        <button onClick={() => setAddingTo(null)} className="px-3 py-1.5 rounded-lg text-xs cursor-pointer" style={{ background: '#2a2d3e', color: '#9CA3AF' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(comida.id)}
                      className="flex items-center gap-1.5 text-xs cursor-pointer font-medium mt-1"
                      style={{ color: '#F5611A' }}
                    >
                      <Plus style={{ width: 13, height: 13 }} />
                      Añadir alimento
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <button
          onClick={addComida}
          className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
          style={{ background: '#161820', border: '1px dashed #2a2d3e', color: '#6B7280' }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Añadir comida
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Generator modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowGenerator(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5 overflow-y-auto" style={{ background: '#161820', border: '1px solid #2a2d3e', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-bold text-white">✨ Generar plan</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Las calorías se calculan automáticamente con la fórmula Mifflin-St Jeor</p>
            </div>

            {/* Sexo */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Sexo</p>
              <div className="flex gap-2">
                {(['hombre', 'mujer'] as const).map(s => (
                  <button key={s} onClick={() => setGenSexo(s)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer capitalize"
                    style={{ background: genSexo === s ? 'rgba(245,97,26,0.15)' : '#1E2130', border: `1px solid ${genSexo === s ? '#F5611A' : '#2a2d3e'}`, color: genSexo === s ? '#F5611A' : '#9CA3AF' }}>
                    {s === 'hombre' ? '♂ Hombre' : '♀ Mujer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Datos físicos */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Datos físicos</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Edad', unit: 'años', val: genEdad, set: setGenEdad, min: 10, max: 100 },
                  { label: 'Peso', unit: 'kg', val: genPeso, set: setGenPeso, min: 30, max: 300 },
                  { label: 'Altura', unit: 'cm', val: genAltura, set: setGenAltura, min: 100, max: 250 },
                ].map(({ label, unit, val, set, min, max }) => (
                  <div key={label} className="rounded-xl p-3" style={{ background: '#1E2130', border: '1px solid #2a2d3e' }}>
                    <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{label}</div>
                    <div className="flex items-baseline gap-1">
                      <input type="number" value={val} onChange={e => set(Number(e.target.value))} min={min} max={max}
                        className="w-full bg-transparent text-white font-bold text-lg outline-none" />
                      <span className="text-xs shrink-0" style={{ color: '#4B5563' }}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividad */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Actividad física</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'sedentario', label: 'Sedentario', desc: 'Escritorio, sin ejercicio' },
                  { key: 'ligero',     label: 'Ligero',     desc: '1-3 días/semana' },
                  { key: 'moderado',   label: 'Moderado',   desc: '4-5 días/semana' },
                  { key: 'activo',     label: 'Muy activo', desc: '6-7 días/semana' },
                ] as { key: Actividad; label: string; desc: string }[]).map(a => (
                  <button key={a.key} onClick={() => setGenActividad(a.key)} className="p-2.5 rounded-xl text-left cursor-pointer"
                    style={{ background: genActividad === a.key ? 'rgba(245,97,26,0.15)' : '#1E2130', border: `1px solid ${genActividad === a.key ? '#F5611A' : '#2a2d3e'}` }}>
                    <div className="text-sm font-semibold" style={{ color: genActividad === a.key ? '#F5611A' : 'white' }}>{a.label}</div>
                    <div className="text-xs" style={{ color: '#4B5563' }}>{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Objetivo */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Objetivo</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: 'definicion',    label: 'Definición',    desc: '-400 kcal del TDEE' },
                  { key: 'volumen',       label: 'Volumen',       desc: '+400 kcal del TDEE' },
                  { key: 'mantenimiento', label: 'Mantenimiento', desc: 'TDEE exacto' },
                  { key: 'perdida',       label: 'Pérdida grasa', desc: '-600 kcal del TDEE' },
                ] as { key: Objetivo; label: string; desc: string }[]).map(o => (
                  <button key={o.key} onClick={() => setGenObjetivo(o.key)} className="p-2.5 rounded-xl text-left cursor-pointer"
                    style={{ background: genObjetivo === o.key ? 'rgba(245,97,26,0.15)' : '#1E2130', border: `1px solid ${genObjetivo === o.key ? '#F5611A' : '#2a2d3e'}` }}>
                    <div className="text-sm font-semibold" style={{ color: genObjetivo === o.key ? '#F5611A' : 'white' }}>{o.label}</div>
                    <div className="text-xs" style={{ color: '#4B5563' }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Calorías calculadas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Calorías calculadas</p>
                <button onClick={() => setGenManual(m => !m)} className="text-xs cursor-pointer" style={{ color: genManual ? '#F5611A' : '#4B5563' }}>
                  {genManual ? 'Usando manual' : 'Editar manualmente'}
                </button>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#1E2130', border: `1px solid ${genManual ? '#F5611A' : '#2a2d3e'}` }}>
                <input type="number" value={genCalorias} onChange={e => { setGenManual(true); setGenCalorias(Number(e.target.value)) }}
                  className="flex-1 bg-transparent text-white font-bold text-2xl outline-none" min={800} max={6000} step={50} />
                <span className="text-sm" style={{ color: '#4B5563' }}>kcal/día</span>
              </div>
              {!genManual && <p className="text-xs mt-1" style={{ color: '#4B5563' }}>TDEE calculado automáticamente · ajustado por objetivo</p>}
            </div>

            {/* Comidas */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>Número de comidas</p>
              <div className="flex gap-2">
                {[3, 4, 5].map(n => (
                  <button key={n} onClick={() => setGenComidas(n)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{ background: genComidas === n ? 'rgba(245,97,26,0.15)' : '#1E2130', border: `1px solid ${genComidas === n ? '#F5611A' : '#2a2d3e'}`, color: genComidas === n ? '#F5611A' : '#9CA3AF' }}>
                    {n} comidas
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {(
                <button
                  disabled={genLoading}
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    setGenLoading(true)
                    try {
                      const perfil = isDemo(clientId) ? null : await fetchPerfilNutricional(clientId)
                      const generated = await generatePlanWithGroq(genSexo, genEdad, genPeso, genAltura, genActividad, genObjetivo, genCalorias, genComidas, clientId, user.id, perfil)
                      if (plan?.id) generated.id = plan.id
                      setPlan(generated)
                      setShowGenerator(false)
                      setGenManual(false)
                      onToast('Plan IA generado. Revísalo y pulsa Guardar.', 'success')
                    } catch (e) {
                      onToast(`Error IA: ${e instanceof Error ? e.message : 'desconocido'}`, 'error')
                    } finally {
                      setGenLoading(false)
                    }
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-white cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: genLoading ? '#7a3010' : '#F5611A', opacity: genLoading ? 0.8 : 1 }}
                >
                  {genLoading
                    ? <><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> Generando con IA...</>
                    : <>✨ Generar con IA — {genCalorias} kcal</>
                  }
                </button>
              )}
              <button
                disabled={genLoading}
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user) return
                  const generated = runGenerator(genObjetivo, genCalorias, genComidas, clientId, user.id)
                  if (plan?.id) generated.id = plan.id
                  setPlan(generated)
                  setShowGenerator(false)
                  setGenManual(false)
                  onToast('Plan generado. Revísalo y pulsa Guardar.', 'info')
                }}
                className="w-full py-2.5 rounded-xl font-medium cursor-pointer"
                style={{ background: '#1E2130', border: '1px solid #2a2d3e', color: '#9CA3AF', opacity: genLoading ? 0.5 : 1 }}
              >
                Generar rápido (sin IA)
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
            onClick={() => setLightboxUrl(null)}
          >×</button>
          <img
            src={lightboxUrl}
            alt="Foto comida"
            className="max-w-full max-h-full rounded-2xl object-contain"
            style={{ maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {showShoppingList && plan && (
        <ShoppingListModal plan={plan} onClose={() => setShowShoppingList(false)} />
      )}
    </div>
  )
}

// ─── Shopping List Modal ──────────────────────────────────────────────────────
const FOOD_CATEGORIES: { label: string; emoji: string; keywords: string[] }[] = [
  { label: 'Carnes y pescados', emoji: '🥩', keywords: ['pollo', 'pavo', 'ternera', 'solomillo', 'cerdo', 'lomo', 'salmón', 'atún', 'merluza', 'bacalao', 'gambas', 'sardinas', 'pechuga', 'muslo', 'bonito', 'lubina', 'dorada'] },
  { label: 'Huevos y proteína', emoji: '🥚', keywords: ['huevo', 'claras', 'whey', 'proteína'] },
  { label: 'Lácteos', emoji: '🥛', keywords: ['yogur', 'queso', 'leche', 'requesón', 'kéfir', 'skyr'] },
  { label: 'Frutas', emoji: '🍎', keywords: ['plátano', 'manzana', 'fresas', 'arándanos', 'naranja', 'kiwi', 'pera', 'uvas', 'piña', 'mango', 'melón', 'sandía', 'frambuesas', 'fruta', 'mandarina', 'limón'] },
  { label: 'Verduras', emoji: '🥦', keywords: ['brócoli', 'espinacas', 'lechuga', 'calabacín', 'champiñones', 'tomate', 'pimiento', 'cebolla', 'ajo', 'zanahoria', 'pepino', 'coliflor', 'col', 'judías', 'ensalada', 'verdura', 'rúcula', 'acelga', 'berenjena', 'apio'] },
  { label: 'Cereales y carbohidratos', emoji: '🌾', keywords: ['arroz', 'avena', 'pan', 'patata', 'boniato', 'pasta', 'quinoa', 'tortita', 'maíz', 'centeno', 'copos', 'harina', 'cuscús'] },
  { label: 'Aceites y grasas', emoji: '🫒', keywords: ['aceite', 'oliva', 'aguacate', 'nueces', 'almendras', 'mantequilla', 'cacahuete', 'semillas', 'chía', 'lino', 'anacardos'] },
]

// Unidades prácticas de compra (España)
const PRACTICAL_UNITS: { keywords: string[]; unitG: number; unitLabel: string }[] = [
  { keywords: ['atún en agua', 'bonito del norte'], unitG: 80, unitLabel: 'lata (80g escurrida)' },
  { keywords: ['sardinas'], unitG: 90, unitLabel: 'lata (90g)' },
  { keywords: ['yogur griego'], unitG: 125, unitLabel: 'bote (125g)' },
  { keywords: ['yogur'], unitG: 125, unitLabel: 'bote (125g)' },
  { keywords: ['huevo entero'], unitG: 60, unitLabel: 'huevo L (60g)' },
  { keywords: ['claras de huevo'], unitG: 30, unitLabel: 'clara (30g)' },
  { keywords: ['proteína whey', 'whey'], unitG: 30, unitLabel: 'cacito (30g)' },
  { keywords: ['pan integral'], unitG: 35, unitLabel: 'rebanada (35g)' },
  { keywords: ['tortita de arroz'], unitG: 9, unitLabel: 'tortita (9g)' },
  { keywords: ['pechuga de pollo'], unitG: 150, unitLabel: '½ pechuga (150g)' },
]

function getPracticalUnit(nombre: string, totalG: number): string {
  const key = nombre.toLowerCase()
  const match = PRACTICAL_UNITS.find(u => u.keywords.some(kw => key.includes(kw)))
  if (!match) return `${totalG}g`
  const units = Math.ceil(totalG / match.unitG)
  return `${totalG}g · ${units} ${units === 1 ? match.unitLabel : match.unitLabel.replace(/\(.*\)/, '').trim() + 's'}`
}

interface ShoppingItem { nombre: string; gramos: number }

function categorize(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  const result: Record<string, ShoppingItem[]> = {}
  const used = new Set<string>()

  for (const cat of FOOD_CATEGORIES) {
    const matched = items.filter(it => {
      const key = it.nombre.toLowerCase()
      return cat.keywords.some(kw => key.includes(kw))
    })
    if (matched.length) {
      result[`${cat.emoji} ${cat.label}`] = matched
      matched.forEach(m => used.add(m.nombre))
    }
  }

  const otros = items.filter(it => !used.has(it.nombre))
  if (otros.length) result['🛒 Otros'] = otros

  return result
}

function ShoppingListModal({ plan, onClose }: { plan: PlanNutricional; onClose: () => void }) {
  const [dias, setDias] = useState(7)

  const totals = new Map<string, number>()
  for (const comida of plan.comidas) {
    for (const a of comida.alimentos) {
      totals.set(a.nombre, (totals.get(a.nombre) ?? 0) + a.gramos)
    }
  }

  const items: ShoppingItem[] = Array.from(totals.entries()).map(([nombre, gramos]) => ({
    nombre,
    gramos: Math.round(gramos * dias),
  }))

  const categorized = categorize(items)

  const copyText = `🛒 Lista de la compra (${dias} días)\n\n` +
    Object.entries(categorized).map(([cat, foods]) =>
      `${cat}\n${foods.map(f => `  • ${f.nombre} — ${getPracticalUnit(f.nombre, f.gramos)}`).join('\n')}`
    ).join('\n\n')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid #2a2d3e', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2130' }}>
          <div>
            <h3 className="font-bold text-white">🛒 Lista de la compra</h3>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Cantidades para {dias} {dias === 1 ? 'día' : 'días'}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => navigator.clipboard?.writeText(copyText)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{ background: '#1E2130', color: '#9CA3AF' }}>
              Copiar
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-lg" style={{ background: '#1E2130', color: '#9CA3AF' }}>×</button>
          </div>
        </div>

        {/* Selector de días */}
        <div className="px-5 py-3 flex gap-2" style={{ borderBottom: '1px solid #1E2130' }}>
          <span className="text-xs self-center mr-1" style={{ color: '#6B7280' }}>Días:</span>
          {[1, 3, 5, 7, 14].map(d => (
            <button key={d} onClick={() => setDias(d)}
              className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ background: dias === d ? '#F5611A' : '#1E2130', color: dias === d ? 'white' : '#9CA3AF', border: `1px solid ${dias === d ? '#F5611A' : '#2a2d3e'}` }}>
              {d === 7 ? '1 semana' : d === 14 ? '2 semanas' : `${d}d`}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="overflow-y-auto p-5 space-y-4">
          {Object.entries(categorized).map(([cat, foods]) => (
            <div key={cat}>
              <p className="text-sm font-semibold text-white mb-2">{cat}</p>
              <div className="space-y-1">
                {foods.map(f => (
                  <div key={f.nombre} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#1E2130' }}>
                    <span className="text-sm text-white">{f.nombre}</span>
                    <span className="text-xs font-medium text-right" style={{ color: '#6B7280', maxWidth: '55%' }}>
                      {getPracticalUnit(f.nombre, f.gramos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: '#6B7280' }}>El plan no tiene alimentos aún</p>
          )}
        </div>
      </div>
    </div>
  )
}
