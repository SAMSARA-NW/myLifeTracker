# Business access

Business and invoice routes require the authorised owner's email-code session in the business Supabase project. The personal/shared project is separate and was not migrated by this change.

## Browser configuration

Use `.env.example` as the variable-name reference. All `VITE_` values must be public. The business key is a publishable key, never a service-role JWT or secret key. `VITE_BUSINESS_OWNER_ID` is a public UUID matching the owner enforced in database policies.

The owner selects **Email me a code**, receives the code through Supabase Auth, and enters it on the same page. Public sign-up is disabled. A separate auth storage key keeps the business session separate from the personal project. Sign-out removes private query-cache entries.

## Database rollout

`supabase/business-migrations/001_owner_access.sql` applies only to the business project. It restricts private financial tables and the invoice-number RPC to the configured owner while retaining server-side service access. Public preorder inserts remain allowed; reading customer preorder details is denied.

Apply the migration once, after validating owner sign-in. Do not apply it to the personal/shared project or infer that enabling RLS revokes privileged API keys. Legacy-key retirement and backend credential migration are separate rollout steps.

## Checks

- `npm test` checks application behaviour, including signed-out/non-owner gates and sign-out cache clearing.
- `npm run test:security` checks that privileged browser credentials are rejected.
- `npm run build` runs the browser-credential check before compiling.
- Verify anonymous REST requests cannot read private tables, owner reads work, and public preorder submission remains possible. Use rollback transactions or intercepted requests for synthetic checks so they do not create customer records.

Bank-data errors must remain visible. Do not reintroduce hard-coded bank-account fallbacks or print an invoice with guessed payment details.
