import { useRef, useState } from 'react'
import {
  Download,
  ExternalLink,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { useVault } from '../lib/store'
import { downloadBackup, makeBackup, parseBackup } from '../lib/backup'
import type { Backup } from '../lib/backup'
import { transact } from '../lib/database'
import { Modal } from '../components/Editor'
import { GateStarter } from '../components/GateStarter'
import { AccountCard } from '../components/Account'

export function SettingsPage() {
  const {
    workspace,
    user,
    online,
    sync,
    syncState,
    syncError,
    resolve,
    notify,
    run,
    importData,
  } = useVault()
  const [busy, setBusy] = useState(false)
  const [staged, setStaged] = useState<Backup | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const conflicts = Object.values(workspace.pending).filter((p) => p.conflict)
  async function selectFile(file?: File) {
    if (!file) return
    if (file.size > 10_000_000) {
      notify('Backups must be smaller than 10 MB.')
      return
    }
    try {
      setStaged(parseBackup(await file.text()))
    } catch (e) {
      notify(
        e instanceof Error ? e.message : 'This file could not be imported.',
      )
    }
  }
  return (
    <div className="page-content settings-page">
      <div className="page-heading">
        <div>
          <span className="overline">MAKE YOURSELF AT HOME</span>
          <h1>
            Your space, your way<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Keep your learning connected, private, and safely backed up.
          </p>
        </div>
      </div>
      <AccountCard />
      <section className="settings-card">
        <div className="settings-icon blue">
          <RefreshCw size={23} />
        </div>
        <div className="settings-card-content">
          <h2>Always pick up where you left off</h2>
          <p>
            {user
              ? 'Changes sync automatically when you reconnect, return to the app, and every 20 seconds while it is open.'
              : 'Local mode saves your subjects, lessons, and notes on this device, including offline. Sign in to enable cross-device sync.'}
          </p>
          <div className="sync-detail">
            <span>
              <i
                className={`status-dot ${syncState === 'error' ? 'error' : ''}`}
              />
              {!online
                ? 'You are offline'
                : !user
                  ? 'Local workspace'
                  : syncState === 'syncing'
                    ? 'Syncing…'
                    : syncState === 'error'
                      ? 'Sync needs attention'
                      : 'Connected to your account'}
            </span>
            <span>{Object.keys(workspace.pending).length} pending changes</span>
          </div>
          {workspace.lastSynced && (
            <p className="small muted">
              Last synced {new Date(workspace.lastSynced).toLocaleString()}
            </p>
          )}
          {syncError && (
            <p className="form-error" role="alert">
              {syncError}
            </p>
          )}
          {user && (
            <div className="settings-buttons">
              <button
                className="button button-secondary"
                disabled={!online || syncState === 'syncing'}
                onClick={() => run(sync())}
              >
                <RefreshCw size={15} />
                Sync now
              </button>
              <button
                className="button button-secondary"
                onClick={() =>
                  run(
                    transact('guest').then((local) => {
                      const backup = makeBackup(local)
                      if (!backup.subjects.length)
                        notify(
                          'There are no subjects in this device’s local library.',
                        )
                      else setStaged(backup)
                    }),
                  )
                }
              >
                <HardDrive size={15} />
                Copy local library to account
              </button>
            </div>
          )}
          <p className="privacy-note">
            <ShieldCheck size={15} />
            Conflicting edits are kept for your review. Nothing is silently
            overwritten.
          </p>
        </div>
      </section>
      {conflicts.length > 0 && (
        <section className="settings-card" id="conflicts">
          <div className="settings-card-content">
            <h2>Let’s keep the right version</h2>
            <p>
              These items changed on another device while you were editing.
              Review both versions before choosing.
            </p>
            {conflicts.map((p) => {
              const row = p.conflict!.row
              return (
                <article className="conflict-card" key={p.record_id}>
                  <h3>
                    {String(
                      p.patch.name ||
                        p.patch.title ||
                        ('name' in (workspace[p.table][p.record_id] || {})
                          ? (
                              workspace[p.table][p.record_id] as {
                                name: string
                              }
                            ).name
                          : 'Lesson change'),
                    )}
                  </h3>
                  {p.conflict?.reason === 'parent_deleted' && (
                    <p className="form-error">
                      This item’s subject or topic was deleted on another
                      device. Discard this change, then copy anything you need
                      into an active subject.
                    </p>
                  )}
                  <div className="conflict-versions">
                    <div>
                      <strong>Your changes</strong>
                      <dl>
                        {Object.entries(p.patch).map(([key, value]) => (
                          <div key={key}>
                            <dt>{key.replace(/_/g, ' ')}</dt>
                            <dd>{value === null ? 'None' : String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div>
                      <strong>Other device</strong>
                      {row ? (
                        <dl>
                          {Object.keys(p.patch).map((key) => (
                            <div key={key}>
                              <dt>{key.replace(/_/g, ' ')}</dt>
                              <dd>
                                {String(
                                  (row as unknown as Record<string, unknown>)[
                                    key
                                  ] ?? 'None',
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p>Item no longer exists.</p>
                      )}
                      {row?.deleted_at && (
                        <p className="form-error">Deleted on another device.</p>
                      )}
                    </div>
                  </div>
                  <div className="settings-buttons">
                    {p.conflict?.reason !== 'parent_deleted' && (
                      <button
                        className="button button-primary"
                        onClick={() => run(resolve(p.record_id, true))}
                      >
                        {row?.deleted_at
                          ? 'Restore my version'
                          : 'Keep my changes'}
                      </button>
                    )}
                    <button
                      className="button button-secondary"
                      onClick={() => run(resolve(p.record_id, false))}
                    >
                      Use other device’s version
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
      <GateStarter />
      <section className="settings-card">
        <div className="settings-icon sand">
          <Download size={23} />
        </div>
        <div className="settings-card-content">
          <h2>A little peace of mind</h2>
          <p>
            Take your library with you. Backups include subjects, topics,
            lessons, completion status, and your notes.
          </p>
          <div className="settings-buttons">
            <button
              className="button button-primary"
              onClick={() => {
                downloadBackup(workspace)
                notify('Your backup is ready to download.')
              }}
            >
              <Download size={16} />
              Export library
            </button>
            <button
              className="button button-secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={16} />
              Import backup
            </button>
            <input
              ref={fileInput}
              className="hidden"
              type="file"
              accept=".json,application/json"
              aria-label="Import backup file"
              onChange={(e) => {
                void selectFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          <p className="field-hint">
            Imports add a new copy to your library. Existing subjects stay
            intact. Keep backups somewhere private.
          </p>
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-icon rose">
          <BookIcon />
        </div>
        <div className="settings-card-content">
          <h2>Give your study space a home</h2>
          <p>
            Install StudyVault from your browser’s menu for a focused app
            experience. On iPhone, use Safari → Share → Add to Home Screen. Your
            library works offline; YouTube playback needs a connection.
          </p>
          <a
            className="subtle-link"
            href="https://support.google.com/chrome/answer/9658361"
            target="_blank"
            rel="noreferrer"
          >
            How to install a web app
            <ExternalLink size={13} />
          </a>
        </div>
      </section>
      {staged && (
        <Modal
          title="Bring your learning with you"
          onClose={() => setStaged(null)}
        >
          <p className="form-intro">
            Add a copy of{' '}
            <strong>
              {staged.subjects.length} subjects, {staged.topics.length} topics,
              and {staged.lessons.length} lessons
            </strong>{' '}
            to {user ? 'your account' : 'this local workspace'}? Existing data
            will be kept. Reimporting creates another copy.
          </p>
          <div className="modal-actions">
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setStaged(null)}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                run(
                  importData(staged)
                    .then(() => setStaged(null))
                    .finally(() => setBusy(false)),
                )
              }}
            >
              <Upload size={15} />
              {busy ? 'Importing…' : 'Import library'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function BookIcon() {
  return <HardDrive size={23} />
}
