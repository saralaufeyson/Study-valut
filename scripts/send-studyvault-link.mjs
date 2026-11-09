import { createInterface } from 'node:readline'
import { createClient } from '@supabase/supabase-js'
import { env, projectUrl, publicKey } from './lib/supabase-cloud.mjs'

// Receive the user-authorized test address over stdin, never in source or logs.
const input = createInterface({ input: process.stdin })
console.log('Ready for test email JSON on stdin.')
const line = await new Promise((resolve) => input.once('line', resolve))
input.close()
let client
try {
  const { email } = JSON.parse(line)
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('A valid test email address is required.')
  if (!projectUrl || !publicKey)
    throw new Error('Public Supabase configuration is missing.')
  client = createClient(projectUrl, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const origin = env.STUDYVAULT_APP_URL
    ? new URL(env.STUDYVAULT_APP_URL).origin
    : 'http://localhost:5173'
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/settings` },
  })
  if (error) {
    console.error(
      `Magic Link request failed (${error.code || error.status || 'auth_error'}). No credentials were printed.`,
    )
    process.exitCode = 1
  } else
    console.log(
      'Supabase accepted the Magic Link request. Open the email on this laptop to finish the sign-in test.',
    )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await client?.auth.stopAutoRefresh()
  await client?.realtime.disconnect()
}
