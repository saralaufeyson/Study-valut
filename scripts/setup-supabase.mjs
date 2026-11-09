import fs from 'node:fs'
import path from 'node:path'
import {
  cli,
  projectRef,
  root,
  target,
  readQuery,
  findValue,
} from './lib/supabase-cloud.mjs'
import { configureAuth } from './configure-supabase-auth.mjs'
import { generateTypes } from './generate-supabase-types.mjs'
import { verifyCloud } from './verify-supabase-cloud.mjs'

// Only these reviewed, additive/permission-only migrations are authorized by
// this bootstrap. New migration files require a fresh review before inclusion.
const reviewed = new Set([
  '202611070001_studyvault.sql',
  '20261107120000_restrict_sync_rpc.sql',
])
const apply = process.argv.includes('--apply')
try {
  target() // Validate the project reference before touching local CLI state.
  if (!fs.existsSync(path.join(root, 'supabase/config.toml'))) cli(['init'])
  try {
    cli(['whoami'])
  } catch {
    throw new Error(
      'Supabase login is required. Run npm run supabase:login, authorize in your browser, then rerun this command. Your app publishable key cannot administer the project.',
    )
  }
  cli(['link', '--project-ref', projectRef])
  console.log('Linked the existing cloud project configured in .env.')
  const before = findValue(
    readQuery('supabase/checks/preflight.sql'),
    'studyvault_preflight',
  )
  if (!before || !Array.isArray(before.tables))
    throw new Error(
      'Could not inspect the remote schema. No migrations were applied.',
    )
  const history = cli(['migration', 'list', target()])
  const baseApplied = history.migrations?.some(
    (item) => item.remote === '202611070001',
  )
  if (!baseApplied && (before.tables.length || before.rpc_exists))
    throw new Error(
      'Existing StudyVault objects were found without the matching migration history. They must be reviewed before migration; no reset, overwrite, or history repair was attempted.',
    )
  if (baseApplied && (before.tables.length !== 4 || !before.rpc_exists))
    throw new Error(
      'The tracked schema is incomplete. Investigate existing remote state before changing it; no reset or overwrite was attempted.',
    )
  const plan = cli(['db', 'push', target(), '--dry-run', '--skip-vault'])
  if (
    !Array.isArray(plan.migrations) ||
    plan.migrations.some((name) => !reviewed.has(name)) ||
    plan.seeds?.length ||
    plan.roles?.length
  )
    throw new Error(
      'The migration plan contains unreviewed changes. No changes were applied.',
    )
  console.log(
    `Reviewed migration plan: ${plan.migrations.length ? plan.migrations.join(', ') : 'already up to date'}. No seeds, role files, or vault updates.`,
  )
  if (!apply)
    console.log(
      'Plan only. Use npm run supabase:setup to apply the reviewed setup.',
    )
  else {
    if (plan.migrations.length)
      cli(['db', 'push', target(), '--skip-vault', '--yes'])
    configureAuth()
    generateTypes()
    await verifyCloud({ workflow: true })
    console.log(
      'StudyVault cloud setup completed. Sign in from the app to synchronize your learning across devices.',
    )
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
