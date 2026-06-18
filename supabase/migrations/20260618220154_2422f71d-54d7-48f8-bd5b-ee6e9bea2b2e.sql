DROP POLICY IF EXISTS "Allowed codes readable for login validation" ON public.allowed_codes;

CREATE POLICY "Moderador reads allowed codes"
  ON public.allowed_codes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderador'::app_role));
