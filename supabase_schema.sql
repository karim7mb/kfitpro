-- KFitPro — Esquema Supabase con schema propio
-- Permite convivir con otros proyectos en el mismo Supabase
-- Ejecutar en: SQL Editor → New query → Run

-- ============================
-- CREAR SCHEMA PROPIO
-- ============================

CREATE SCHEMA IF NOT EXISTS kfitpro;

-- Dar acceso al rol anon y authenticated
GRANT USAGE ON SCHEMA kfitpro TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA kfitpro TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kfitpro TO authenticated;

-- ============================
-- TABLAS
-- ============================

CREATE TABLE kfitpro.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'cliente')),
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES kfitpro.usuarios(id) ON DELETE CASCADE,
  entrenador_id UUID REFERENCES kfitpro.usuarios(id),
  objetivo TEXT,
  edad INT,
  peso_inicial NUMERIC(5,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.rutinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cliente_id UUID REFERENCES kfitpro.clientes(id) ON DELETE CASCADE,
  programa TEXT,
  semana_actual INT DEFAULT 1,
  dias_semana INT DEFAULT 3,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.dias_rutina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rutina_id UUID REFERENCES kfitpro.rutinas(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL,
  nombre_dia TEXT
);

CREATE TABLE kfitpro.ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  grupo_muscular TEXT,
  youtube_url TEXT,
  created_by UUID REFERENCES kfitpro.usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.ejercicios_rutina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_id UUID REFERENCES kfitpro.dias_rutina(id) ON DELETE CASCADE,
  ejercicio_id UUID REFERENCES kfitpro.ejercicios(id),
  series INT,
  reps_min INT,
  reps_max INT,
  peso_kg NUMERIC(6,2),
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  orden INT DEFAULT 0
);

CREATE TABLE kfitpro.registros_peso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES kfitpro.clientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.planes_nutricion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES kfitpro.clientes(id) ON DELETE CASCADE UNIQUE,
  calorias INT,
  proteinas_g NUMERIC(6,1),
  carbos_g NUMERIC(6,1),
  grasas_g NUMERIC(6,1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.registros_nutricion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES kfitpro.clientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  calorias INT,
  proteinas_g NUMERIC(6,1),
  carbos_g NUMERIC(6,1),
  grasas_g NUMERIC(6,1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.comidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID REFERENCES kfitpro.registros_nutricion(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  hora TIME,
  calorias INT,
  proteinas_g NUMERIC(5,1),
  carbos_g NUMERIC(5,1),
  grasas_g NUMERIC(5,1)
);

CREATE TABLE kfitpro.mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remitente_id UUID REFERENCES kfitpro.usuarios(id),
  destinatario_id UUID REFERENCES kfitpro.usuarios(id),
  texto TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kfitpro.sesiones_entrenamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES kfitpro.clientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  completada BOOLEAN DEFAULT FALSE,
  ejercicios_completados INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================
-- ROW LEVEL SECURITY
-- ============================

ALTER TABLE kfitpro.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.rutinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.dias_rutina ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.ejercicios_rutina ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.registros_peso ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.planes_nutricion ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.registros_nutricion ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.comidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kfitpro.sesiones_entrenamiento ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario actual
CREATE OR REPLACE FUNCTION kfitpro.get_user_role()
RETURNS TEXT AS $$
  SELECT rol FROM kfitpro.usuarios WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Políticas: usuarios
CREATE POLICY "kfp_usuarios_self" ON kfitpro.usuarios
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "kfp_admin_all_usuarios" ON kfitpro.usuarios
  FOR ALL USING (kfitpro.get_user_role() = 'admin');

-- Políticas: clientes
CREATE POLICY "kfp_cliente_self" ON kfitpro.clientes
  FOR SELECT USING (usuario_id = auth.uid());

CREATE POLICY "kfp_admin_clientes" ON kfitpro.clientes
  FOR ALL USING (
    entrenador_id = auth.uid() AND kfitpro.get_user_role() = 'admin'
  );

-- Políticas: mensajes
CREATE POLICY "kfp_mensajes" ON kfitpro.mensajes
  FOR ALL USING (
    remitente_id = auth.uid() OR destinatario_id = auth.uid()
  );

-- Políticas: registros_peso
CREATE POLICY "kfp_peso_self" ON kfitpro.registros_peso
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM kfitpro.clientes WHERE usuario_id = auth.uid())
  );
CREATE POLICY "kfp_peso_admin" ON kfitpro.registros_peso
  FOR ALL USING (
    cliente_id IN (SELECT id FROM kfitpro.clientes WHERE entrenador_id = auth.uid())
  );

-- Políticas: ejercicios
CREATE POLICY "kfp_ejercicios_read" ON kfitpro.ejercicios
  FOR SELECT USING (TRUE);
CREATE POLICY "kfp_ejercicios_admin" ON kfitpro.ejercicios
  FOR ALL USING (
    created_by = auth.uid() AND kfitpro.get_user_role() = 'admin'
  );

-- ============================
-- ÍNDICES
-- ============================

CREATE INDEX idx_kfp_clientes_entrenador ON kfitpro.clientes(entrenador_id);
CREATE INDEX idx_kfp_clientes_usuario ON kfitpro.clientes(usuario_id);
CREATE INDEX idx_kfp_mensajes_remitente ON kfitpro.mensajes(remitente_id);
CREATE INDEX idx_kfp_mensajes_destinatario ON kfitpro.mensajes(destinatario_id);
CREATE INDEX idx_kfp_peso_cliente ON kfitpro.registros_peso(cliente_id, fecha);
CREATE INDEX idx_kfp_nutricion_cliente ON kfitpro.registros_nutricion(cliente_id, fecha);

-- ============================
-- VERIFICAR
-- ============================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'kfitpro'
ORDER BY table_name;
