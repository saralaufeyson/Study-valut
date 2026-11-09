import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { BookOpen, Check, Link as LinkIcon, X } from 'lucide-react'
import { colors, youtubeId } from '../lib/model'
import type { Lesson, Subject, Table, Topic } from '../lib/model'
import { useVault } from '../lib/store'

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialog.current!
    el.showModal()
    return () => el.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        const rect = e.currentTarget.getBoundingClientRect()
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        )
          onClose()
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export type EditorState =
  | { kind: 'subjects'; record?: Subject }
  | { kind: 'topics'; parentId: string; record?: Topic; position: number }
  | { kind: 'lessons'; parentId: string; record?: Lesson; position: number }
export function Editor({
  editor,
  onClose,
}: {
  editor: EditorState
  onClose: () => void
}) {
  const { create, change, notify } = useVault()
  const subject = editor.kind === 'subjects' ? editor.record : undefined
  const lesson = editor.kind === 'lessons' ? editor.record : undefined
  const [name, setName] = useState(
    lesson?.title ||
      (editor.kind !== 'lessons' ? editor.record?.name : '') ||
      '',
  )
  const [description, setDescription] = useState(subject?.description || '')
  const [color, setColor] = useState(subject?.color || 'sage')
  const [icon, setIcon] = useState(subject?.icon || 'book')
  const [url, setUrl] = useState(lesson?.url || '')
  const [notes, setNotes] = useState(lesson?.notes || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const singular =
    editor.kind === 'subjects'
      ? 'subject'
      : editor.kind === 'topics'
        ? 'topic'
        : 'lesson'
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const videoId = youtubeId(url)
    if (editor.kind === 'lessons' && !videoId) {
      setError(
        'Paste a valid YouTube video link. Playlist-only links need a specific video.',
      )
      return
    }
    if (!name.trim()) {
      setError('Please enter a name.')
      return
    }
    const patch =
      editor.kind === 'subjects'
        ? { name: name.trim(), description: description.trim(), color, icon }
        : editor.kind === 'topics'
          ? {
              name: name.trim(),
              subject_id: editor.parentId,
              position: editor.record?.position ?? editor.position,
            }
          : {
              title: name.trim(),
              topic_id: editor.parentId,
              position: editor.record?.position ?? editor.position,
              url: url.trim(),
              video_id: videoId,
              notes,
              ...(!lesson ? { completed: false, last_opened_at: null } : {}),
            }
    setBusy(true)
    try {
      if (editor.record) await change(editor.kind, editor.record.id, patch)
      else await create(editor.kind, patch)
      notify(
        `${singular[0].toUpperCase() + singular.slice(1)} ${editor.record ? 'updated' : 'added'}.`,
      )
      onClose()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not save. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={`${editor.record ? 'Edit' : 'New'} ${singular}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          void submit(e)
        }}
        className="editor-form"
      >
        <p className="form-intro">
          {editor.kind === 'subjects'
            ? 'A little space for something you want to learn.'
            : editor.kind === 'topics'
              ? 'Break your subject into a manageable chapter.'
              : 'Bring a good lesson into your own quiet study space.'}
        </p>
        {editor.kind === 'lessons' && (
          <label>
            YouTube video link
            <div className="input-with-icon">
              <LinkIcon size={17} />
              <input
                type="url"
                required
                maxLength={2000}
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            <span className="field-hint">
              YouTube, Shorts, and video links from playlists are supported.
            </span>
          </label>
        )}
        <label>
          {editor.kind === 'lessons'
            ? 'Lesson title'
            : `${singular[0].toUpperCase() + singular.slice(1)} name`}
          <input
            required
            autoFocus={editor.kind !== 'lessons'}
            maxLength={editor.kind === 'lessons' ? 200 : 120}
            placeholder={
              editor.kind === 'subjects'
                ? 'e.g. Mathematics'
                : editor.kind === 'topics'
                  ? 'e.g. The fundamentals'
                  : 'Give this lesson a memorable title'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {editor.kind === 'subjects' && (
          <>
            <label>
              <span>
                Description <span className="optional">optional</span>
              </span>
              <textarea
                rows={3}
                maxLength={1000}
                placeholder="What would you like to explore?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <fieldset>
              <legend>Subject color</legend>
              <div className="color-options">
                {colors.map((c) => (
                  <button
                    type="button"
                    key={c}
                    aria-label={c}
                    aria-pressed={color === c}
                    className={`color-option ${c} ${color === c ? 'selected' : ''}`}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={18} />}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              Icon
              <select
                aria-label="Subject icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              >
                <option value="book">Book</option>
                <option value="code">Code</option>
                <option value="math">Mathematics</option>
                <option value="science">Science</option>
                <option value="art">Art & design</option>
                <option value="language">Languages</option>
              </select>
            </label>
          </>
        )}
        {editor.kind === 'lessons' && (
          <label>
            <span>
              Lesson notes <span className="optional">optional</span>
            </span>
            <textarea
              rows={4}
              maxLength={20000}
              placeholder="A question, an idea, or something to remember…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button-primary" disabled={busy}>
            <BookOpen size={16} />
            {busy
              ? 'Saving…'
              : editor.record
                ? 'Save changes'
                : `Create ${singular}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
export function DeleteDialog({
  table,
  id,
  name,
  onClose,
}: {
  table: Table
  id: string
  name: string
  onClose: () => void
}) {
  const { remove } = useVault()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Modal
      title={`Delete ${table === 'subjects' ? 'subject' : table === 'topics' ? 'topic' : 'lesson'}?`}
      onClose={onClose}
    >
      <p className="form-intro">
        “{name}”{table !== 'lessons' ? ' and everything inside it' : ''} will be
        removed from your library. This cannot be undone. Export a backup first
        if you want to keep a copy.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button className="button button-secondary" onClick={onClose}>
          Keep it
        </button>
        <button
          className="button button-danger"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void remove(table, id)
              .then(onClose)
              .catch((e) => {
                setError(String(e))
                setBusy(false)
              })
          }}
        >
          {busy ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Modal>
  )
}
