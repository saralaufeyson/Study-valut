import { useEffect, useState } from 'react'
import { ExternalLink, GraduationCap, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Modal } from './Editor'
import { starterPacks, topicCount } from '../lib/starter-pack'
import type { StarterPack } from '../lib/starter-pack'
import { useVault } from '../lib/store'

export function StarterPacks() {
  const { user, addStarter, run } = useVault()
  const [preview, setPreview] = useState<StarterPack | null>(null)
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id !== 'starter-packs' && id !== 'gate-starter') return
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.hash])
  return (
    <>
      <section className="settings-card" id="starter-packs">
        <div className="settings-icon sage">
          <GraduationCap size={23} />
        </div>
        <div className="settings-card-content">
          <h2>Starter packs</h2>
          <p>
            Give your exam preparation a starting point. Preview an outline,
            then add its subjects and ordered topics to your library. Add your
            own videos as you study.
          </p>
          <div className="starter-pack-grid">
            {starterPacks.map((pack) => (
              <article
                className="starter-pack-card"
                key={pack.id}
                id={pack.id === 'gate-2027-cs' ? 'gate-starter' : pack.id}
              >
                <span className="overline">{pack.shortName}</span>
                <h3>{pack.title}</h3>
                <p>{pack.description}</p>
                <span className="starter-pack-count">
                  {pack.subjects.length} subjects · {topicCount(pack)} topics
                </span>
                <button
                  className="button button-secondary"
                  onClick={() => setPreview(pack)}
                >
                  <GraduationCap size={16} /> Preview {pack.shortName} starter
                </button>
              </article>
            ))}
          </div>
          <p className="field-hint">
            Existing notes, videos, and progress are preserved. Repeating a pack
            adds only missing subjects and topics.
          </p>
        </div>
      </section>
      {preview && (
        <Modal title={preview.title} onClose={() => !busy && setPreview(null)}>
          <p className="form-intro">{preview.scope}</p>
          <p className="form-intro">
            Add{' '}
            <strong>
              {preview.subjects.length} subjects and {topicCount(preview)}{' '}
              topics
            </strong>{' '}
            to {user ? 'your account' : 'this local workspace'}. Expand a
            subject to see its topics. No video lessons are included.
          </p>
          <div className="starter-subjects">
            {preview.subjects.map((subject) => (
              <details className="starter-subject" key={subject.name}>
                <summary>
                  {subject.name}
                  <span>{subject.topics.length} topics</span>
                </summary>
                <p>{subject.description}</p>
                <ol>
                  {subject.topics.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
          <div className="starter-sources">
            <span className="field-hint">
              Sources checked {preview.checkedAt}
            </span>
            {preview.sources.map((source) => (
              <a
                className="subtle-link"
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label} <ExternalLink size={13} />
              </a>
            ))}
          </div>
          {!user && (
            <p className="field-hint">
              For access on other devices, sign in first or copy your local
              library to your account later.
            </p>
          )}
          <div className="modal-actions starter-actions">
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                run(
                  addStarter(preview.id)
                    .then(() => setPreview(null))
                    .finally(() => setBusy(false)),
                )
              }}
            >
              <Plus size={15} />
              {busy ? 'Adding…' : `Add ${preview.shortName} subjects & topics`}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
