import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { cli, root, target } from './lib/supabase-cloud.mjs'

export function generateTypes() {
  const output = cli(
    ['gen', 'types', '--lang', 'typescript', '--schema', 'public', target()],
    { json: false },
  )
  const start = output.indexOf('export type Json')
  if (start < 0 || !output.includes('export type Database'))
    throw new Error(
      'Supabase did not return TypeScript database types. The existing type file was preserved.',
    )
  fs.writeFileSync(
    path.join(root, 'src/lib/database.types.ts'),
    '// Generated from the linked Supabase public schema. Run npm run supabase:types to refresh.\n' +
      output.slice(start) +
      '\n',
  )
  console.log('Generated src/lib/database.types.ts from the live cloud schema.')
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    generateTypes()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
