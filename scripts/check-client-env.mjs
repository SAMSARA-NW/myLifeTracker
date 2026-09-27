import { loadEnv } from 'vite'
import { pathToFileURL } from 'node:url'

// Vite embeds every VITE_* value in public JavaScript. Print names, never values.
export function findPrivilegedClientVariables(env) {
  return Object.entries(env).filter(([name, value]) => {
    if (!name.startsWith('VITE_') || typeof value !== 'string') return false
    if (value.trim().startsWith('sb_secret_')) return true
    if (/SERVICE[_-]?ROLE|SECRET[_-]?KEY|PRIVATE[_-]?KEY|ACCESS[_-]?TOKEN/i.test(name)) return true
    const parts = value.trim().split('.')
    if (parts.length !== 3) return false
    try {
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
      // Static user sessions are secrets too; only the legacy public anon JWT is safe.
      return typeof claims === 'object' && claims !== null &&
        (('role' in claims && claims.role !== 'anon') || 'sub' in claims)
    } catch {
      return false
    }
  }).map(([name]) => name)
}

export function validateClientEnv(env) {
  const names = findPrivilegedClientVariables(env)
  if (names.length) {
    throw new Error(`Refusing to expose privileged credentials in browser code: ${names.join(', ')}. Use public keys with authenticated access controls; keep privileged keys on the server.`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.env.npm_lifecycle_event === 'predev' ? 'development' : 'production'
  try {
    validateClientEnv(loadEnv(mode, process.cwd(), 'VITE_'))
    console.log('Browser environment credential check passed.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
