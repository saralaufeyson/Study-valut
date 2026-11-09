import { useState } from 'react'
import { ExternalLink, GraduationCap, Plus } from 'lucide-react'
import { Modal } from './Editor'
import { gateCS, starterTopicCount } from '../lib/starter-pack'
import { useVault } from '../lib/store'

export function GateStarter() {
  const { user, addStarter, run } = useVault()
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <section className="settings-card" id="gate-starter">
        <div className="settings-icon sage">
          <GraduationCap size={23} />
        </div>
        <div className="settings-card-content">
          <h2>Your GATE 2027 CS starting point</h2>
          <p>
            {gateCS.subjects.length} subjects and {starterTopicCount} ordered
            topics, including General Aptitude, based on IIT Madras’s 2027
            syllabus. Add your own videos as you study; lesson completion starts
            at zero.
          </p>
          <div className="settings-buttons">
            <button
              className="button button-secondary"
              onClick={() => setPreview(true)}
            >
              <GraduationCap size={16} /> Preview GATE CS starter
            </button>
          </div>
          {gateCS.sources.map((source) => (
            <p key={source.url}>
              <a
                className="subtle-link"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label} <ExternalLink size={13} />
              </a>
            </p>
          ))}
        </div>
      </section>
      {preview && (
        <Modal
          title="GATE 2027 · Computer Science & IT"
          onClose={() => !busy && setPreview(false)}
        >
          <p className="form-intro">
            Add missing subjects and topics to{' '}
            {user ? 'your account' : 'this local workspace'}. Existing names,
            notes, videos, and progress are preserved. No videos are included.
          </p>
          <ul>
            {gateCS.subjects.map((subject) => (
              <li key={subject.name}>
                {subject.name} · {subject.topics.length} topics
              </li>
            ))}
          </ul>
          {!user && (
            <p className="field-hint">
              For access on other devices, sign in first or copy your local
              library to your account later.
            </p>
          )}
          <div className="modal-actions">
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => setPreview(false)}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                run(
                  addStarter()
                    .then(() => setPreview(false))
                    .finally(() => setBusy(false)),
                )
              }}
            >
              <Plus size={15} />{' '}
              {busy ? 'Adding…' : 'Add GATE CS subjects & topics'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
