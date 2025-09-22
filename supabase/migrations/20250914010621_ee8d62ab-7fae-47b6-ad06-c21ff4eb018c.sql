-- Temporary policy to allow creating announcements for testing without authentication
CREATE POLICY "Allow creating announcements for testing" 
ON public.announcements 
FOR INSERT 
WITH CHECK (true);