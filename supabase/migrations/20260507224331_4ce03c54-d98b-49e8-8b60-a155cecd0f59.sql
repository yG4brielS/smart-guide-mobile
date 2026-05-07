CREATE POLICY "Psicologo and treinador view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'psicologo') OR public.has_role(auth.uid(), 'treinador') OR public.has_role(auth.uid(), 'moderador'));