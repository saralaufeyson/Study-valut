import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './supabase-config'

const url = 'https://example-project.supabase.co'
const publicKey = 'sb_publishable_test_value'
const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.test`
describe('Supabase public configuration', () => {
  it('reads and trims publishable credentials', () => {
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: ` ${url} `,
        VITE_SUPABASE_PUBLISHABLE_KEY: ` ${publicKey} `,
      }),
    ).toEqual({ url, key: publicKey })
  })
  it('supports the public legacy anon key', () => {
    const key = jwt('anon')
    expect(
      readSupabaseConfig({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: key,
      }),
    ).toEqual({ url, key })
  })
  it('preserves local mode when no cloud configuration is present', () => {
    expect(readSupabaseConfig({})).toBeNull()
  })
  it('reports incomplete configuration', () => {
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: url })).toThrow(
      'Set VITE_SUPABASE_URL',
    )
  })
  it.each(['sb_secret_test_value', jwt('service_role'), jwt('authenticated')])(
    'rejects a non-public key without echoing it',
    (key) => {
      try {
        readSupabaseConfig({
          VITE_SUPABASE_URL: url,
          VITE_SUPABASE_PUBLISHABLE_KEY: key,
        })
        throw new Error('Expected rejection')
      } catch (error) {
        expect((error as Error).message).toMatch(/not allowed|cannot be used/)
        expect((error as Error).message).not.toContain(key)
      }
    },
  )
  it('rejects a secret in the legacy variable even when a publishable key is selected', () => {
    expect(() =>
      readSupabaseConfig({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_PUBLISHABLE_KEY: publicKey,
        VITE_SUPABASE_ANON_KEY: 'sb_secret_test_value',
      }),
    ).toThrow('cannot be used')
  })
  it.each([
    'not-a-url',
    'file:///tmp/project',
    'https://user:password@example.com',
    `${url}?key=value`,
  ])('rejects an invalid project URL: %s', (invalidUrl) => {
    expect(() =>
      readSupabaseConfig({
        VITE_SUPABASE_URL: invalidUrl,
        VITE_SUPABASE_PUBLISHABLE_KEY: publicKey,
      }),
    ).toThrow('HTTP or HTTPS')
  })
})
