
-- ============================================
-- ENUM de papéis
-- ============================================
CREATE TYPE public.app_role AS ENUM ('atleta', 'psicologo', 'treinador');

-- ============================================
-- Tabela: allowed_codes (códigos pré-autorizados)
-- ============================================
CREATE TABLE public.allowed_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_codes ENABLE ROW LEVEL SECURITY;

-- Leitura pública só para validar código durante login (sem expor email/senha)
CREATE POLICY "Allowed codes readable for login validation"
  ON public.allowed_codes FOR SELECT
  USING (true);

-- ============================================
-- Tabela: profiles
-- ============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Tabela: user_roles (separada por segurança)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Função SECURITY DEFINER para checar papel (evita recursão)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- Policies profiles
-- ============================================
CREATE POLICY "Users view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Psicologo and treinador view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'psicologo')
    OR public.has_role(auth.uid(), 'treinador')
  );

CREATE POLICY "Users update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Policies user_roles
-- ============================================
CREATE POLICY "Users view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- Tabela: questionnaire_responses
-- ============================================
CREATE TABLE public.questionnaire_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  week INT NOT NULL,
  tension INT NOT NULL CHECK (tension BETWEEN 0 AND 10),
  depression INT NOT NULL CHECK (depression BETWEEN 0 AND 10),
  anger INT NOT NULL CHECK (anger BETWEEN 0 AND 10),
  vigor INT NOT NULL CHECK (vigor BETWEEN 0 AND 10),
  fatigue INT NOT NULL CHECK (fatigue BETWEEN 0 AND 10),
  confusion INT NOT NULL CHECK (confusion BETWEEN 0 AND 10),
  external_situations INT NOT NULL CHECK (external_situations BETWEEN 0 AND 4),
  sport_situations INT NOT NULL CHECK (sport_situations BETWEEN 0 AND 4),
  sleep_quality INT NOT NULL CHECK (sleep_quality BETWEEN 0 AND 4),
  performance INT NOT NULL CHECK (performance BETWEEN 0 AND 4),
  followup_note TEXT,
  stress_index INT NOT NULL,
  stress_level TEXT NOT NULL CHECK (stress_level IN ('baixo', 'moderado', 'alto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, week)
);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atleta inserts own response"
  ON public.questionnaire_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'atleta'));

CREATE POLICY "Atleta views own responses"
  ON public.questionnaire_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Psicologo and treinador view all responses"
  ON public.questionnaire_responses FOR SELECT
  USING (
    public.has_role(auth.uid(), 'psicologo')
    OR public.has_role(auth.uid(), 'treinador')
  );

-- ============================================
-- Tabela: psychologist_notes
-- ============================================
CREATE TABLE public.psychologist_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.psychologist_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Psicologo manages notes"
  ON public.psychologist_notes FOR ALL
  USING (public.has_role(auth.uid(), 'psicologo'))
  WITH CHECK (public.has_role(auth.uid(), 'psicologo') AND auth.uid() = author_user_id);

CREATE POLICY "Treinador reads notes"
  ON public.psychologist_notes FOR SELECT
  USING (public.has_role(auth.uid(), 'treinador'));

-- ============================================
-- Trigger: auto-criar profile + role no signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_allowed RECORD;
BEGIN
  v_code := NEW.raw_user_meta_data->>'code';

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'Código do aluno é obrigatório';
  END IF;

  SELECT * INTO v_allowed FROM public.allowed_codes WHERE code = v_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código não autorizado';
  END IF;

  INSERT INTO public.profiles (user_id, code, full_name, must_change_password)
  VALUES (NEW.id, v_allowed.code, v_allowed.full_name, true);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_allowed.role);

  UPDATE public.allowed_codes SET used = true WHERE code = v_code;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Trigger: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.psychologist_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- Seed: códigos de teste
-- ============================================
INSERT INTO public.allowed_codes (code, full_name, role) VALUES
  ('2024001', 'João Silva', 'atleta'),
  ('2024002', 'Maria Souza', 'atleta'),
  ('2024003', 'Pedro Costa', 'atleta'),
  ('PSI001', 'Ana Lima', 'psicologo'),
  ('TRE001', 'Carlos Mendes', 'treinador');
