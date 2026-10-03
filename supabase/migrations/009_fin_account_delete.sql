-- Allow removing investment/personal/business accounts from the app.
-- Entries are removed automatically via fin_monthly_entries.account_id ON DELETE CASCADE.
-- Idempotent so it can be re-run safely.

drop policy if exists "fin_accounts_delete" on fin_accounts;
create policy "fin_accounts_delete" on fin_accounts for delete using (true);
