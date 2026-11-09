import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Check,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useVault } from '../lib/store'
import { supabase } from '../lib/supabase'
import {
  authCallbackFailed,
  authErrorMessage,
  isAuthRateLimit,
  minimumPasswordLength,
  savePassword,
  submitAuth,
} from '../lib/auth'
import type { AuthMode } from '../lib/auth'

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  minimum,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  disabled: boolean
  minimum?: number
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label>
      {label}
      <span className="password-input">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minimum}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <button
          className="icon-button"
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          disabled={disabled}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  )
}

function AuthFeedback({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message && (
        <p className="success-message" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

function PasswordForm({ onSaved }: { onSaved: () => void }) {
  const { online } = useVault()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    try {
      await savePassword(supabase.auth, password, confirmation)
      setPassword('')
      setConfirmation('')
      onSaved()
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="signin-form"
      aria-label="Set password"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <PasswordInput
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        disabled={busy}
        minimum={minimumPasswordLength}
      />
      <PasswordInput
        label="Confirm new password"
        value={confirmation}
        onChange={setConfirmation}
        autoComplete="new-password"
        disabled={busy}
        minimum={minimumPasswordLength}
      />
      <span className="field-hint">
        Use at least {minimumPasswordLength} characters. Your existing library
        stays with this account.
      </span>
      <button className="button button-primary" disabled={busy || !online}>
        <KeyRound size={16} />
        {busy ? 'Saving…' : 'Save password'}
      </button>
      <AuthFeedback message="" error={error} />
    </form>
  )
}

export function AccountCard() {
  const { user, online, notify } = useVault()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [editingPassword, setEditingPassword] = useState(false)
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  function switchMode(next: AuthMode) {
    setMode(next)
    setPassword('')
    setConfirmation('')
    setMessage('')
    setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || busy || (mode !== 'signin' && cooldown > 0)) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await submitAuth(
        supabase.auth,
        mode,
        { email, password, confirmation },
        location.origin,
      )
      setPassword('')
      setConfirmation('')
      setMessage(result.message)
      if (result.emailSent) setCooldown(60)
    } catch (error) {
      setError(authErrorMessage(error))
      if (isAuthRateLimit(error) && mode !== 'signin') setCooldown(60)
    } finally {
      setBusy(false)
    }
  }
  async function signOut() {
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      switchMode('signin')
      setEditingPassword(false)
      notify(
        'Signed out on this device. Your account library is saved for your next login.',
      )
    } catch (error) {
      setError(authErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const descriptions: Record<AuthMode, string> = {
    signin:
      'Log in with your email and password to continue your learning on any device.',
    signup:
      'Choose a password, then verify your email using the one-time link. Future logins use your password.',
    reset:
      'Enter your account email. We’ll send a link so you can choose a new password. This also works if you previously used only sign-in links.',
    resend:
      'Request a new signup verification link if you have not verified your email yet.',
  }
  const submitLabels: Record<AuthMode, string> = {
    signin: 'Log in',
    signup: 'Create account & send verification',
    reset: 'Send password reset link',
    resend: 'Resend verification link',
  }
  return (
    <section className="settings-card" id="account">
      <div className="settings-icon sage">
        <Cloud size={23} />
      </div>
      <div className="settings-card-content">
        <h2>
          {user
            ? 'Your account'
            : mode === 'signin'
              ? 'Welcome back'
              : mode === 'signup'
                ? 'Create your StudyVault account'
                : mode === 'reset'
                  ? 'Reset your password'
                  : 'Verify your email'}
        </h2>
        <p>
          {user
            ? `Signed in as ${user.email}. Use the same email on your other devices.`
            : descriptions[mode]}
        </p>
        {!supabase ? (
          <div className="setup-notice">
            <CloudOff size={19} />
            <div>
              <strong>Cloud sync is ready to connect.</strong>
              <p>
                Your library is saved in this browser. Follow the project README
                to connect Supabase and enable account login.
              </p>
            </div>
          </div>
        ) : user ? (
          <>
            <div className="account-actions">
              <span className="privacy-note">
                <ShieldCheck size={16} />
                Your learning data is private to your account.
              </span>
              <div className="auth-links">
                <button
                  className="button button-secondary"
                  disabled={busy}
                  aria-expanded={editingPassword}
                  onClick={() => {
                    setEditingPassword(!editingPassword)
                    setMessage('')
                    setError('')
                  }}
                >
                  <KeyRound size={15} />
                  Set or change password
                </button>
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => {
                    void signOut()
                  }}
                >
                  Sign out on this device
                </button>
              </div>
            </div>
            {editingPassword && (
              <PasswordForm
                key={user.id}
                onSaved={() => {
                  setEditingPassword(false)
                  setMessage(
                    'Password saved. Use your email and password next time you log in.',
                  )
                }}
              />
            )}
          </>
        ) : (
          <>
            <div className="auth-tabs" aria-label="Account options">
              <button
                type="button"
                className={`button ${mode === 'signin' ? 'button-primary' : 'button-secondary'}`}
                disabled={busy}
                aria-pressed={mode === 'signin'}
                onClick={() => switchMode('signin')}
              >
                Log in
              </button>
              <button
                type="button"
                className={`button ${mode === 'signup' ? 'button-primary' : 'button-secondary'}`}
                disabled={busy}
                aria-pressed={mode === 'signup'}
                onClick={() => switchMode('signup')}
              >
                Sign up
              </button>
            </div>
            <form
              className="signin-form"
              aria-label={
                mode === 'signin'
                  ? 'Log in'
                  : mode === 'signup'
                    ? 'Sign up'
                    : mode === 'reset'
                      ? 'Request password reset'
                      : 'Resend verification'
              }
              onSubmit={(event) => {
                void submit(event)
              }}
            >
              <label>
                Email address
                <input
                  type="email"
                  autoComplete={
                    mode === 'reset' || mode === 'resend' ? 'email' : 'username'
                  }
                  required
                  placeholder="you@example.com"
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              {(mode === 'signin' || mode === 'signup') && (
                <PasswordInput
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  minimum={
                    mode === 'signup' ? minimumPasswordLength : undefined
                  }
                  disabled={busy}
                />
              )}
              {mode === 'signup' && (
                <>
                  <PasswordInput
                    label="Confirm password"
                    value={confirmation}
                    onChange={setConfirmation}
                    autoComplete="new-password"
                    minimum={minimumPasswordLength}
                    disabled={busy}
                  />
                  <span className="field-hint">
                    Use at least {minimumPasswordLength} characters. We’ll email
                    you a one-time verification link.
                  </span>
                </>
              )}
              <button
                className="button button-primary"
                disabled={
                  busy || !online || (mode !== 'signin' && cooldown > 0)
                }
              >
                {mode === 'signin' ? <LogIn size={16} /> : <Mail size={16} />}
                {busy
                  ? 'Please wait…'
                  : mode !== 'signin' && cooldown > 0
                    ? `Wait ${cooldown}s before another email`
                    : submitLabels[mode]}
              </button>
              <span className="field-hint">
                Your account library is separate from this browser’s local
                library. You can copy your local library after logging in.
              </span>
            </form>
            <div className="auth-links">
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  switchMode(mode === 'reset' ? 'signin' : 'reset')
                }
              >
                {mode === 'reset' ? 'Back to login' : 'Forgot password?'}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() =>
                  switchMode(mode === 'resend' ? 'signin' : 'resend')
                }
              >
                {mode === 'resend' ? 'Back to login' : 'Resend verification'}
              </button>
            </div>
            {!online && (
              <p className="field-hint">
                You’re offline. Your local library is available; reconnect to
                use your account.
              </p>
            )}
          </>
        )}
        <AuthFeedback message={message} error={error} />
      </div>
    </section>
  )
}

export function PasswordResetPage() {
  const { user } = useVault()
  const [saved, setSaved] = useState(false)
  const [invalidLink] = useState(() => authCallbackFailed(location.href))
  return (
    <div className="page-content settings-page">
      <div className="page-heading">
        <div>
          <span className="overline">YOUR ACCOUNT</span>
          <h1>
            {saved ? 'Your password is ready.' : 'Choose a new password.'}
          </h1>
        </div>
      </div>
      <section className="settings-card">
        <div className="settings-icon sage">
          <KeyRound size={23} />
        </div>
        <div className="settings-card-content">
          {saved ? (
            <>
              <h2>Password saved</h2>
              <p>
                Use your email and new password next time. Your library is
                ready.
              </p>
              <Link className="button button-primary" to="/settings">
                Continue to your account
              </Link>
            </>
          ) : user && !invalidLink ? (
            <>
              <h2>Set your password</h2>
              <p>
                Choose a password for {user.email}. Your subjects, notes, and
                progress stay with your account.
              </p>
              <PasswordForm key={user.id} onSaved={() => setSaved(true)} />
            </>
          ) : (
            <>
              <h2>Open your latest password reset link</h2>
              <p>
                If the link has expired or has already been used, request a new
                one from the login page.
              </p>
              <Link className="button button-primary" to="/settings">
                Back to login
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
