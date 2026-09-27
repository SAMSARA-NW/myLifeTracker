-- Business project ONLY: recqyhjooukkdwsrjslp, not the shared personal database.
-- Apply after the owner can sign in to the preview using a public browser key.
-- Preserve server-side service_role access and the public preorder INSERT path.
BEGIN;
DO $migration$
DECLARE
  owner_id uuid;
  target_table text;
  old_policy record;
BEGIN
  SELECT id INTO STRICT owner_id FROM auth.users
    WHERE lower(email) = 'nicolas.criticos98@gmail.com';
  FOREACH target_table IN ARRAY ARRAY[
    'bank_details', 'clients', 'cost_components', 'expenses',
    'invoice_items', 'invoices', 'products', 'sales', 'system_params'
  ] LOOP
    FOR old_policy IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', old_policy.policyname, target_table);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', target_table);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', target_table);
    EXECUTE format(
      'CREATE POLICY business_owner ON public.%I FOR ALL TO authenticated USING ((select auth.uid()) = %L::uuid) WITH CHECK ((select auth.uid()) = %L::uuid)',
      target_table, owner_id, owner_id);
  END LOOP;
END;
$migration$;

-- Customer details in preorders must not be readable from a public API key.
ALTER TABLE public.pre_order_hemp ENABLE ROW LEVEL SECURITY;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.pre_order_hemp FROM anon, authenticated;
GRANT INSERT ON public.pre_order_hemp TO anon;
CREATE POLICY public_preorder_insert ON public.pre_order_hemp FOR INSERT TO anon WITH CHECK (true);

-- Restrict number allocation too; merely enabling table RLS does not protect RPCs.
DO $rpc$
DECLARE owner_id uuid;
BEGIN
  SELECT id INTO STRICT owner_id FROM auth.users WHERE lower(email) = 'nicolas.criticos98@gmail.com';
  EXECUTE format($definition$
CREATE OR REPLACE FUNCTION public.generate_invoice_number(biz text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $function$
DECLARE seq_val int; prefix text; yr text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM %L::uuid THEN RAISE EXCEPTION 'Business owner access required' USING ERRCODE = '42501'; END IF;
  yr := to_char(current_date, 'YYYY');
  IF biz = 'samsara' THEN prefix := 'SAM'; seq_val := nextval('invoice_seq_samsara');
  ELSIF biz = 'ebn' THEN prefix := 'EBN'; seq_val := nextval('invoice_seq_ebn');
  ELSE RAISE EXCEPTION 'Unknown business'; END IF;
  RETURN prefix || '-' || yr || '-' || lpad(seq_val::text, 3, '0');
END;
$function$;
$definition$, owner_id);
END;
$rpc$;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(text) TO authenticated, service_role;
COMMIT;
