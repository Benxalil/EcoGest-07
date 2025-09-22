-- Temporary policy to allow reading schools for testing without authentication
CREATE POLICY "Allow reading schools for testing" 
ON public.schools 
FOR SELECT 
USING (true);