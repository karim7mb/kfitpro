import type { AppUser } from '../lib/supabase'

export const demoTrainer: AppUser = {
  id: 'admin-001',
  email: 'admin@kfitpro.com',
  nombre: 'Entrenador Admin',
  rol: 'admin',
}

export const demoClient: AppUser = {
  id: 'client-001',
  email: 'carlos@kfitpro.com',
  nombre: 'Carlos Ruiz',
  rol: 'cliente',
}

export const demoClients = [
  {
    id: 'client-001',
    nombre: 'Carlos Ruiz',
    objetivo: 'Definición muscular',
    edad: 28,
    pesoInicial: 85,
    activo: true,
    iniciales: 'CR',
    color: '#F5611A',
    semanas: 16,
    cumplimiento: 87,
  },
  {
    id: 'client-002',
    nombre: 'Ana García',
    objetivo: 'Pérdida de peso',
    edad: 32,
    pesoInicial: 72,
    activo: true,
    iniciales: 'AG',
    color: '#8B5CF6',
    semanas: 8,
    cumplimiento: 92,
  },
  {
    id: 'client-003',
    nombre: 'Miguel Torres',
    objetivo: 'Ganancia muscular',
    edad: 25,
    pesoInicial: 70,
    activo: true,
    iniciales: 'MT',
    color: '#10B981',
    semanas: 12,
    cumplimiento: 78,
  },
  {
    id: 'client-004',
    nombre: 'Laura Sánchez',
    objetivo: 'Resistencia cardiovascular',
    edad: 29,
    pesoInicial: 62,
    activo: false,
    iniciales: 'LS',
    color: '#3B82F6',
    semanas: 4,
    cumplimiento: 65,
  },
]

export const demoRutina = {
  nombre: 'Push/Pull/Legs',
  semanaActual: 8,
  semana_actual: 8,
  diasSemana: 3,
  activa: true,
  dias: [
    {
      id: 'dia-1',
      nombre: 'Lunes',
      titulo: 'Pecho / Hombros / Tríceps',
      ejercicios: [
        { id: 'e1', nombre: 'Press Banca', series: 4, repsMin: 8, repsMax: 10, peso: 80, rpe: 8 },
        { id: 'e2', nombre: 'Press Inclinado', series: 3, repsMin: 10, repsMax: 12, peso: 65, rpe: 7 },
        { id: 'e3', nombre: 'Press Militar', series: 3, repsMin: 10, repsMax: 12, peso: 55, rpe: 7 },
        { id: 'e4', nombre: 'Extensiones Tríceps', series: 3, repsMin: 12, repsMax: 15, peso: 30, rpe: 6 },
      ],
    },
    {
      id: 'dia-2',
      nombre: 'Miércoles',
      titulo: 'Espalda / Bíceps',
      ejercicios: [
        { id: 'e5', nombre: 'Peso Muerto', series: 4, repsMin: 5, repsMax: 8, peso: 120, rpe: 9 },
        { id: 'e6', nombre: 'Dominadas', series: 4, repsMin: 6, repsMax: 8, peso: 0, rpe: 8 },
        { id: 'e7', nombre: 'Remo Barra', series: 3, repsMin: 8, repsMax: 10, peso: 60, rpe: 7 },
        { id: 'e8', nombre: 'Curl Bíceps', series: 3, repsMin: 12, repsMax: 15, peso: 20, rpe: 7 },
      ],
    },
    {
      id: 'dia-3',
      nombre: 'Viernes',
      titulo: 'Piernas',
      ejercicios: [
        { id: 'e9', nombre: 'Sentadilla Libre', series: 4, repsMin: 6, repsMax: 10, peso: 100, rpe: 8 },
        { id: 'e10', nombre: 'Prensa Pierna', series: 4, repsMin: 10, repsMax: 12, peso: 150, rpe: 7 },
        { id: 'e11', nombre: 'Curl Femoral', series: 3, repsMin: 10, repsMax: 12, peso: 40, rpe: 7 },
        { id: 'e12', nombre: 'Extensiones Cuádriceps', series: 3, repsMin: 12, repsMax: 15, peso: 35, rpe: 6 },
      ],
    },
  ],
}

export const demoPeso = [
  { mes: 'Ene', peso: 85.0 },
  { mes: 'Feb', peso: 84.0 },
  { mes: 'Mar', peso: 83.0 },
  { mes: 'Abr', peso: 82.5 },
  { mes: 'May', peso: 82.0 },
  { mes: 'Jun', peso: 81.5 },
]

export const demoNutricion = {
  calorias: 2500,
  proteinas: 175,
  carbos: 280,
  grasas: 75,
  cumplimientoSemanal: [
    { dia: 'L', valor: 92 },
    { dia: 'M', valor: 85 },
    { dia: 'X', valor: 100 },
    { dia: 'J', valor: 78 },
    { dia: 'V', valor: 95 },
    { dia: 'S', valor: 60 },
    { dia: 'D', valor: 72 },
  ],
}

export const demoChat = [
  { id: 'm1', remitente: 'client-001', texto: '¿Cómo fue el entrenamiento de ayer?', hora: '10:30', leido: true },
  { id: 'm2', remitente: 'admin-001', texto: 'Muy bien! Subí 5kg en sentadilla 💪', hora: '10:35', leido: true },
  { id: 'm3', remitente: 'client-001', texto: 'Duda sobre el agarre ¿supino o prono?', hora: '11:15', leido: true },
  { id: 'm4', remitente: 'admin-001', texto: 'Agarre prono doble por ahora. A los 150kg pasamos a mixto.', hora: '11:20', leido: true },
]

export const demoEjercicios = [
  {
    id: 'ej1',
    nombre: 'Sentadilla Libre',
    descripcion: 'Ejercicio fundamental de tren inferior',
    grupo: 'Piernas',
    youtubeUrl: 'https://www.youtube.com/watch?v=bEv6CCg2BC8',
    youtubeId: 'bEv6CCg2BC8',
  },
  {
    id: 'ej2',
    nombre: 'Press Banca',
    descripcion: 'Empuje horizontal principal para desarrollo pectoral',
    grupo: 'Pecho',
    youtubeUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    youtubeId: 'rT7DgCr-3pg',
  },
  {
    id: 'ej3',
    nombre: 'Peso Muerto',
    descripcion: 'Cadena posterior completa, fuerza global',
    grupo: 'Espalda',
    youtubeUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
    youtubeId: 'op9kVnSso6Q',
  },
  {
    id: 'ej4',
    nombre: 'Dominadas',
    descripcion: 'Tracción vertical con peso corporal, gran dorsal',
    grupo: 'Espalda',
    youtubeUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    youtubeId: 'eGo4IYlbE5g',
  },
  {
    id: 'ej5',
    nombre: 'Press Militar',
    descripcion: 'Empuje vertical overhead, hombros y tríceps',
    grupo: 'Hombros',
    youtubeUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    youtubeId: '2yjwXTZQDDI',
  },
  {
    id: 'ej6',
    nombre: 'Curl Bíceps',
    descripcion: 'Aislamiento bíceps con mancuernas, control excéntrico',
    grupo: 'Brazos',
    youtubeUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
    youtubeId: 'ykJmrZ5v0Oo',
  },
  {
    id: 'ej7',
    nombre: 'Hip Thrust',
    descripcion: 'Activación máxima de glúteo mayor con barra',
    grupo: 'Glúteos',
    youtubeUrl: 'https://www.youtube.com/watch?v=SEdqd1n0cvg',
    youtubeId: 'SEdqd1n0cvg',
  },
  {
    id: 'ej8',
    nombre: 'Remo en Polea',
    descripcion: 'Tracción horizontal para espalda media y romboides',
    grupo: 'Espalda',
    youtubeUrl: 'https://www.youtube.com/watch?v=GZbfZ033f74',
    youtubeId: 'GZbfZ033f74',
  },
]

export const demoMedidas = [
  { fecha: '2026-07-01', cintura: 92, cadera: 104, pecho: 98, brazo: 37, muslo: 62 },
  { fecha: '2026-08-01', cintura: 89, cadera: 101, pecho: 96, brazo: 37.5, muslo: 60 },
  { fecha: '2026-09-01', cintura: 86, cadera: 98, pecho: 94, brazo: 38, muslo: 58 },
]

export const demoRendimiento = [
  { fecha: '2026-07-01', ejercicio: 'Sentadilla', peso_kg: 80, reps: 5 },
  { fecha: '2026-08-01', ejercicio: 'Sentadilla', peso_kg: 87.5, reps: 5 },
  { fecha: '2026-09-01', ejercicio: 'Sentadilla', peso_kg: 95, reps: 5 },
  { fecha: '2026-07-01', ejercicio: 'Press banca', peso_kg: 65, reps: 8 },
  { fecha: '2026-08-01', ejercicio: 'Press banca', peso_kg: 72.5, reps: 8 },
  { fecha: '2026-09-01', ejercicio: 'Press banca', peso_kg: 80, reps: 8 },
  { fecha: '2026-07-15', ejercicio: 'Peso muerto', peso_kg: 110, reps: 5 },
  { fecha: '2026-09-01', ejercicio: 'Peso muerto', peso_kg: 125, reps: 5 },
]

export const grupoColors: Record<string, string> = {
  Piernas: '#3B82F6',
  Pecho: '#EF4444',
  Espalda: '#10B981',
  Brazos: '#F59E0B',
  Hombros: '#8B5CF6',
  Glúteos: '#EC4899',
  Core: '#06B6D4',
  Todos: '#6B7280',
}
