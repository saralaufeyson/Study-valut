interface SupabaseEnvironment {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_PUBLISHABLE_KEY?: string
  VITE_SUPABASE_ANON_KEY?: string
}

// Shared by Vite's build configuration and the browser client. Never log values.
export function readSupabaseConfig(env: SupabaseEnvironment) {
  const url = env.VITE_SUPABASE_URL?.trim()
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()

  // Validate both public-key variables, including an unused legacy fallback:
  // any VITE_ variable can be exposed by a frontend build.
  for (const key of [publishableKey, anonKey]) {
    if (!key) continue
    if (key.startsWith('sb_secret_')) {
      throw new Error(
        'Supabase secret keys cannot be used in VITE_ variables. Use a publishable key instead.',
      )
    }
    if (
      key.startsWith('sb_publishable_') &&
      key.length > 'sb_publishable_'.length
    )
      continue
    try {
      const parts = key.split('.')
      if (parts.length !== 3) throw new Error()
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
      )
      if (payload.role === 'anon') continue
    } catch {
      /* Report only the configuration problem, never the credential. */
    }
    throw new Error(
      'Supabase requires a publishable key or a legacy anon key. Secret and service_role keys are not allowed in this frontend.',
    )
  }

  const key = publishableKey || anonKey
  if (!url && !key) return null // Preserve the application's explicit local mode.
  if (!url || !key)
    throw new Error(
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env, then restart Vite.',
    )

  try {
    const parsed = new URL(url)
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error()
  } catch {
    throw new Error(
      'VITE_SUPABASE_URL must be an HTTP or HTTPS project URL without credentials, query parameters, or a fragment.',
    )
  }
  return { url, key }
}
