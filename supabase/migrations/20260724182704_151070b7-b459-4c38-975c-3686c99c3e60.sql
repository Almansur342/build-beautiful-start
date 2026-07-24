CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feedback" ON public.feedback
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins read all feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- allow super admins to view all support tickets/messages via existing policies if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets' AND policyname='Super admins read all tickets') THEN
    EXECUTE 'CREATE POLICY "Super admins read all tickets" ON public.support_tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''super_admin''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets' AND policyname='Super admins update all tickets') THEN
    EXECUTE 'CREATE POLICY "Super admins update all tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''super_admin'')) WITH CHECK (public.has_role(auth.uid(), ''super_admin''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_messages' AND policyname='Super admins read all messages') THEN
    EXECUTE 'CREATE POLICY "Super admins read all messages" ON public.support_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''super_admin''))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_messages' AND policyname='Super admins insert messages') THEN
    EXECUTE 'CREATE POLICY "Super admins insert messages" ON public.support_messages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''super_admin''))';
  END IF;
END $$;