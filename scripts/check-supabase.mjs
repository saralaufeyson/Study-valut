import { createServer } from 'vite'

// Load the real TypeScript client through Vite so .env handling matches the app.
// This checks initialization only; it does not send email or modify cloud data.
let server
let client
try {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  })
  const module = await server.ssrLoadModule('/src/lib/supabase.ts')
  client = module.supabase
  if (!client) {
    console.error(
      'Supabase is not configured. Set the public project URL and publishable key in .env.',
    )
    process.exitCode = 1
  } else {
    const { error } = await client.auth.getSession()
    if (error) throw new Error('Session initialization failed.')
    if (
      typeof client.from !== 'function' ||
      typeof client.auth.signInWithPassword !== 'function' ||
      typeof client.auth.signUp !== 'function' ||
      typeof client.auth.resetPasswordForEmail !== 'function' ||
      typeof client.auth.updateUser !== 'function'
    )
      throw new Error('Client initialization failed.')
    console.log(
      'Supabase client initialized successfully using the Vite environment.',
    )
    console.log(
      'Database and email authentication services are available on the client. No credentials were printed.',
    )
    console.log(
      'This checks initialization, not live database access or email delivery.',
    )
  }
} catch {
  console.error(
    'Supabase initialization failed. Check the public URL and publishable/anon key in .env. Secret keys must never use the VITE_ prefix.',
  )
  process.exitCode = 1
} finally {
  await client?.auth.stopAutoRefresh()
  await client?.realtime.disconnect()
  await server?.close()
}
