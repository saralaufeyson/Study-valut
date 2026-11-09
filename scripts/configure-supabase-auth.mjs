import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { cli, env, root, target } from './lib/supabase-cloud.mjs'

export function configureAuth() {
  const authRoot = path.join(root, '.studyvault-setup', 'auth')
  const configPath = path.join(authRoot, 'supabase', 'config.toml')
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  // This comparison-only file is never pushed. It asks the CLI to return just
  // the remote public URL settings without saving credentials from the cloud.
  fs.writeFileSync(
    configPath,
    'project_id = "studyvault-auth"\n[auth]\nsite_url = "http://studyvault-config-probe.invalid"\nadditional_redirect_urls = ["http://studyvault-config-probe.invalid/settings"]\n',
  )
  const preview = cli(['config', 'pull', target(), '--dry-run'], {
    cwd: authRoot,
  })
  const remoteValue = (name) =>
    preview.changes?.find((c) => c.path.join('.') === name)?.remote
  const site = remoteValue('auth.site_url')
  const redirects = remoteValue('auth.additional_redirect_urls')
  if (
    typeof site !== 'string' ||
    !Array.isArray(redirects) ||
    !redirects.every((value) => typeof value === 'string')
  )
    throw new Error(
      'Could not read existing auth URL settings safely. No auth settings were changed.',
    )
  let appOrigin
  if (env.STUDYVAULT_APP_URL) {
    const appUrl = new URL(env.STUDYVAULT_APP_URL)
    if (
      appUrl.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(appUrl.hostname)
    )
      throw new Error('STUDYVAULT_APP_URL must use HTTPS outside localhost.')
    appOrigin = appUrl.origin
  }
  const siteUrl =
    appOrigin ||
    (['', 'http://localhost:3000', 'http://127.0.0.1:3000'].includes(site)
      ? 'http://localhost:5173'
      : site)
  const callbackUrls = [
    ...new Set([
      ...redirects,
      'http://localhost:5173/settings',
      'http://127.0.0.1:5173/settings',
      ...(appOrigin ? [`${appOrigin}/settings`] : []),
    ]),
  ]
  fs.writeFileSync(
    configPath,
    `project_id = "studyvault-auth"\n[auth]\nsite_url = ${JSON.stringify(siteUrl)}\nadditional_redirect_urls = ${JSON.stringify(callbackUrls)}\n[auth.email]\nenabled = true\nenable_confirmations = true\n`,
  )
  const diff = cli(['config', 'diff', target()], { cwd: authRoot })
  // Only the four explicitly requested authentication properties may change.
  const allowed = new Set([
    'auth.site_url',
    'auth.additional_redirect_urls',
    'auth.email.enabled',
    'auth.email.enable_confirmations',
  ])
  if (!Array.isArray(diff.changes))
    throw new Error(
      'The CLI returned an unexpected auth plan. Nothing was pushed.',
    )
  const changes = diff.changes.filter(
    (c) => c.declared === true && c.class !== 'remote_only',
  )
  if (
    changes.some(
      (c) => !Array.isArray(c.path) || !allowed.has(c.path.join('.')),
    )
  )
    throw new Error(
      'Unexpected configuration changes in the auth plan. Nothing was pushed.',
    )
  if (changes.length)
    cli(['config', 'push', target(), '--yes'], { cwd: authRoot })
  console.log(
    'Email Magic Link configuration is ready. Existing redirect URLs and unrelated project settings were preserved.',
  )
  return { changed: changes.length, siteUrl, callbackUrls }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const result = configureAuth()
    console.log(
      JSON.stringify({
        changed: result.changed,
        callbackCount: result.callbackUrls.length,
      }),
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
