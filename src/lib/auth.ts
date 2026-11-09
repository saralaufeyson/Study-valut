import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type AuthMode = 'signin' | 'signup' | 'reset' | 'resend'
export const minimumPasswordLength = 8
type Auth = SupabaseClient<Database>['auth']

export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < minimumPasswordLength)
    throw new Error(
      `Use at least ${minimumPasswordLength} characters for your password.`,
    )
  if (password !== confirmation) throw new Error('The passwords do not match.')
}

export function authRedirect(origin: string, recovery = false) {
  const url = new URL(origin)
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
  )
    throw new Error('Open StudyVault over HTTPS to use your account.')
  return `${url.origin}/${recovery ? 'reset-password' : 'settings'}`
}

export async function submitAuth(
  auth: Auth,
  mode: AuthMode,
  values: { email: string; password: string; confirmation: string },
  origin: string,
) {
  const email = values.email.trim()
  if (!email) throw new Error('Enter your email address.')
  if (mode === 'signin') {
    if (!values.password) throw new Error('Enter your password.')
    const { error } = await auth.signInWithPassword({
      email,
      password: values.password,
    })
    if (error) throw error
    return {
      emailSent: false,
      message: 'Signed in. Your account library is ready.',
    }
  }
  if (mode === 'signup') {
    validateNewPassword(values.password, values.confirmation)
    const { data, error } = await auth.signUp({
      email,
      password: values.password,
      options: { emailRedirectTo: authRedirect(origin) },
    })
    if (error) throw error
    return data.session
      ? {
          emailSent: false,
          message:
            'Your account is ready. Use your email and password next time.',
        }
      : {
          emailSent: true,
          message:
            'Check your inbox for your verification link. After verifying your email, use your email and password to log in. If you already have an account, sign in or reset your password.',
        }
  }
  if (mode === 'reset') {
    const { error } = await auth.resetPasswordForEmail(email, {
      redirectTo: authRedirect(origin, true),
    })
    if (error) throw error
    return {
      emailSent: true,
      message:
        'If an account exists for this email, a password reset link is on its way. Open the latest link to choose a password.',
    }
  }
  const { error } = await auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: authRedirect(origin) },
  })
  if (error) throw error
  return {
    emailSent: true,
    message:
      'If this account needs verification, a new verification link is on its way. Check your inbox and spam folder.',
  }
}

export async function savePassword(
  auth: Auth,
  password: string,
  confirmation: string,
) {
  validateNewPassword(password, confirmation)
  // Supabase Auth owns the password. Never write it to learning records/storage.
  const { error } = await auth.updateUser({ password })
  if (error) throw error
}

export function isAuthRateLimit(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 429
  )
}

export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : ''
  if (code === 'over_email_send_rate_limit')
    return 'Email sending is temporarily limited. Wait before requesting another link. Password login still works for verified accounts.'
  if (isAuthRateLimit(error))
    return 'Too many requests. Please wait before trying again.'
  if (code === 'email_address_not_authorized')
    return 'Email delivery is not available for this address yet. Contact the app owner to finish email setup.'
  if (code === 'email_not_confirmed')
    return 'Verify your email with the signup link before logging in. Use Resend verification if you need a new link.'
  if (code === 'invalid_credentials')
    return 'The email or password is incorrect. If you previously used a sign-in link, use Forgot password to set a password.'
  if (code === 'same_password')
    return 'Choose a password different from your current one.'
  if (error instanceof Error) return error.message
  return 'Your request could not be completed. Please try again.'
}

export function authCallbackFailed(href: string) {
  const url = new URL(href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  return ['error', 'error_code', 'error_description'].some(
    (key) => url.searchParams.has(key) || fragment.has(key),
  )
}
