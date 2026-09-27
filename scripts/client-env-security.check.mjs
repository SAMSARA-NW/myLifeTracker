import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findPrivilegedClientVariables, validateClientEnv } from './check-client-env.mjs'

const jwt = claims => `test.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.not-a-real-signature`

test('blocks legacy admin JWT in an innocently named public variable', () => {
  assert.throws(() => validateClientEnv({ VITE_BUSINESS_SUPABASE_KEY: jwt({ role: 'service_role' }) }), /Refusing/)
})
test('blocks new Supabase secret keys', () => {
  assert.deepEqual(findPrivilegedClientVariables({ VITE_DB_KEY: 'sb_secret_test_fixture' }), ['VITE_DB_KEY'])
})
test('allows public publishable and legacy anon keys', () => {
  assert.doesNotThrow(() => validateClientEnv({ VITE_ANON: jwt({ role: 'anon' }), VITE_PUBLIC: 'sb_publishable_test_fixture' }))
})
test('blocks static user access tokens', () => {
  assert.throws(() => validateClientEnv({ VITE_KEY: jwt({ role: 'authenticated', sub: 'test-user' }) }), /Refusing/)
})
test('does not reject server-only secrets', () => {
  assert.doesNotThrow(() => validateClientEnv({ SUPABASE_SERVICE_KEY: jwt({ role: 'service_role' }) }))
})
test('error output never includes credential values', () => {
  const secret = 'sb_secret_unique_test_fixture'
  try { validateClientEnv({ VITE_KEY: secret }); assert.fail('must reject') }
  catch (error) { assert.match(error.message, /VITE_KEY/); assert.ok(!error.message.includes(secret)) }
})
