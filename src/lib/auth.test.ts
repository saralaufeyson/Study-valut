import { createClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  authCallbackFailed,
  authErrorMessage,
  authRedirect,
  savePassword,
  submitAuth,
} from './auth'
import type { Database } from './database.types'

const user = {
  id: '2428d1cf-e070-450c-b97d-b5566d40d7aa',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'learner@example.test',
  email_confirmed_at: '2026-11-09T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-11-09T00:00:00Z',
}
const session = {
  user,
  access_token: 'fixture-access-token',
  refresh_token: 'fixture-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
}
const values = {
  email: ' learner@example.test ',
  password: '  private test password  ',
  confirmation: '  private test password  ',
}
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Supabase-Api-Version': '2024-01-01',
    },
  })
}
function fixture(body: unknown, status = 200) {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => response(body, status))
  const auth = createClient<Database>(
    'https://studyvault-fixture.supabase.co',
    'sb_publishable_fixture',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetcher },
    },
  ).auth
  return { auth, fetcher }
}

describe('email verification and password authentication', () => {
  it('logs in through the password endpoint without requesting any email and preserves password whitespace', async () => {
    const { auth, fetcher } = fixture(session)
    expect(
      (await submitAuth(auth, 'signin', values, 'https://study.example'))
        .emailSent,
    ).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(String(input))
    expect(url.pathname).toBe('/auth/v1/token')
    expect(url.searchParams.get('grant_type')).toBe('password')
    const body = JSON.parse(String(init?.body))
    expect(body.email).toBe('learner@example.test')
    expect(body.password).toBe(values.password)
  })

  it('creates a password account with one verification email targeting the current site', async () => {
    const { auth, fetcher } = fixture({ ...user, email_confirmed_at: null })
    expect(
      (await submitAuth(auth, 'signup', values, 'https://study.example'))
        .emailSent,
    ).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [input, init] = fetcher.mock.calls[0]
    const url = new URL(String(input))
    expect(url.pathname).toBe('/auth/v1/signup')
    expect(url.searchParams.get('redirect_to')).toBe(
      'https://study.example/settings',
    )
    expect(JSON.parse(String(init?.body)).password).toBe(values.password)
  })

  it('rejects mismatched or short signup passwords before sending email', async () => {
    const { auth, fetcher } = fixture(user)
    await expect(
      submitAuth(
        auth,
        'signup',
        { ...values, confirmation: 'different' },
        'https://study.example',
      ),
    ).rejects.toThrow('do not match')
    await expect(
      submitAuth(
        auth,
        'signup',
        { ...values, password: 'short', confirmation: 'short' },
        'https://study.example',
      ),
    ).rejects.toThrow('at least 8')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('sends password recovery to a dedicated page on the current origin', async () => {
    const { auth, fetcher } = fixture({})
    const result = await submitAuth(
      auth,
      'reset',
      values,
      'http://localhost:5173',
    )
    expect(result.emailSent).toBe(true)
    expect(result.message).toContain('If an account exists')
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.pathname).toBe('/auth/v1/recover')
    expect(url.searchParams.get('redirect_to')).toBe(
      'http://localhost:5173/reset-password',
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('resends signup confirmation without sending a login OTP', async () => {
    const { auth, fetcher } = fixture({})
    await submitAuth(auth, 'resend', values, 'https://study.example')
    const [input, init] = fetcher.mock.calls[0]
    expect(new URL(String(input)).pathname).toBe('/auth/v1/resend')
    expect(JSON.parse(String(init?.body)).type).toBe('signup')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('updates an authenticated account password without creating another account or email', async () => {
    const { auth, fetcher } = fixture(session)
    await submitAuth(auth, 'signin', values, 'https://study.example')
    fetcher.mockClear()
    fetcher.mockImplementation(async () => response(user))
    await savePassword(auth, 'a new test password', 'a new test password')
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [input, init] = fetcher.mock.calls[0]
    expect(new URL(String(input)).pathname).toBe('/auth/v1/user')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      password: 'a new test password',
    })
    expect((await auth.getSession()).data.session?.user.id).toBe(user.id)
  })

  it('does not retry a rate-limited email request and explains that password login remains available', async () => {
    const { auth, fetcher } = fixture(
      { code: 'over_email_send_rate_limit', msg: 'Email rate limit exceeded' },
      429,
    )
    let message = ''
    try {
      await submitAuth(auth, 'signup', values, 'https://study.example')
    } catch (error) {
      message = authErrorMessage(error)
    }
    expect(message).toContain('Password login still works')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects insecure production callbacks and keeps development callbacks local', () => {
    expect(() => authRedirect('http://study.example')).toThrow('HTTPS')
    expect(() => authRedirect('javascript:alert(1)')).toThrow('HTTPS')
    expect(authRedirect('https://study.example/ignored?next=other')).toBe(
      'https://study.example/settings',
    )
    expect(authRedirect('http://127.0.0.1:5173', true)).toBe(
      'http://127.0.0.1:5173/reset-password',
    )
  })
  it('treats expired recovery callbacks as invalid even if an older session exists', () => {
    expect(
      authCallbackFailed(
        'https://study.example/reset-password#error=access_denied&error_code=otp_expired',
      ),
    ).toBe(true)
    expect(
      authCallbackFailed(
        'https://study.example/reset-password?error_description=Expired',
      ),
    ).toBe(true)
    expect(
      authCallbackFailed('https://study.example/reset-password#type=recovery'),
    ).toBe(false)
  })
})
