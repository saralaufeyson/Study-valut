import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  Play,
  Save,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useVault } from '../lib/store'
import { lessonsOf, progress, subjectLessons, topicsOf } from '../lib/model'
import type { Lesson } from '../lib/model'
import { ProgressBar } from './Library'
import { YouTubePlayer } from '../components/YouTubePlayer'

export function StudyPage() {
  const { lessonId = '' } = useParams()
  const { workspace } = useVault()
  const lesson = workspace.lessons[lessonId]
  const topic = lesson ? workspace.topics[lesson.topic_id] : undefined
  const subject = topic ? workspace.subjects[topic.subject_id] : undefined
  if (
    !lesson ||
    lesson.deleted_at ||
    !topic ||
    topic.deleted_at ||
    !subject ||
    subject.deleted_at
  )
    return (
      <div className="page-content empty-state">
        <FileText size={32} />
        <h1>Lesson not found</h1>
        <p>It may have been removed from your library.</p>
        <Link className="button button-secondary" to="/subjects">
          Back to subjects
        </Link>
      </div>
    )
  return <StudySession key={lesson.id} lesson={lesson} subjectId={subject.id} />
}
function StudySession({
  lesson,
  subjectId,
}: {
  lesson: Lesson
  subjectId: string
}) {
  const { workspace, change, run, online } = useVault()
  const [focus, setFocus] = useState(false)
  const [busy, setBusy] = useState(false)
  const opened = useRef(false)
  const lessons = subjectLessons(workspace, subjectId)
  const index = lessons.findIndex((l) => l.id === lesson.id)
  const topic = workspace.topics[lesson.topic_id]
  const subject = workspace.subjects[subjectId]
  const p = progress(lessons)
  useEffect(() => {
    if (!opened.current) {
      opened.current = true
      run(
        change('lessons', lesson.id, {
          last_opened_at: new Date().toISOString(),
        }),
      )
    }
  }, [lesson.id, change, run])
  return (
    <div className={`study-page ${focus ? 'focus-mode' : ''}`}>
      <div className="study-topline">
        <Link className="back-link" to={`/subjects/${subjectId}`}>
          <ArrowLeft size={15} />
          <span>{subject.name}</span>
          <ChevronRight size={13} />
          <span>{topic.name}</span>
        </Link>
        <button
          className="button button-secondary small-button"
          onClick={() => setFocus(!focus)}
        >
          {focus ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          {focus ? 'Exit focus' : 'Focus mode'}
        </button>
      </div>
      <div className="study-layout">
        <div className="study-main">
          <YouTubePlayer
            videoId={lesson.video_id}
            title={lesson.title}
            online={online}
          />
          <div className="study-lesson-heading">
            <div>
              <span className="overline">
                LESSON {String(index + 1).padStart(2, '0')} OF {lessons.length}
                <span className="inline-dot">·</span>
                {topic.name}
              </span>
              <h1>{lesson.title}</h1>
            </div>
            <button
              disabled={busy}
              className={`button ${lesson.completed ? 'button-completed' : 'button-primary'}`}
              onClick={() => {
                setBusy(true)
                run(
                  change('lessons', lesson.id, {
                    completed: !lesson.completed,
                  }).finally(() => setBusy(false)),
                )
              }}
            >
              {lesson.completed ? (
                <CheckCircle2 size={17} />
              ) : (
                <Check size={17} />
              )}
              {lesson.completed ? 'Completed' : 'Mark complete'}
            </button>
          </div>
          <div className="study-navigation">
            {index > 0 ? (
              <Link
                to={`/study/${lessons[index - 1].id}`}
                className="lesson-navigation"
              >
                <ArrowLeft size={17} />
                <div>
                  <span>PREVIOUS LESSON</span>
                  <strong>{lessons[index - 1].title}</strong>
                </div>
              </Link>
            ) : (
              <span />
            )}
            {index < lessons.length - 1 ? (
              <Link
                to={`/study/${lessons[index + 1].id}`}
                className="lesson-navigation next"
              >
                <div>
                  <span>NEXT LESSON</span>
                  <strong>{lessons[index + 1].title}</strong>
                </div>
                <ArrowRight size={17} />
              </Link>
            ) : (
              <Link
                to={`/subjects/${subjectId}`}
                className="lesson-navigation next"
              >
                <div>
                  <span>YOU’VE REACHED THE LAST LESSON</span>
                  <strong>Back to your subject</strong>
                </div>
                <ArrowRight size={17} />
              </Link>
            )}
          </div>
          <Notes lesson={lesson} />
          <a
            className="video-external"
            href={`https://www.youtube.com/watch?v=${lesson.video_id}`}
            target="_blank"
            rel="noreferrer"
          >
            Having trouble with playback? Open on YouTube
            <ExternalLink size={13} />
          </a>
        </div>
        <aside className="study-outline">
          <div className="outline-heading">
            <span className="eyebrow">YOUR LEARNING PATH</span>
            <h2>{subject.name}</h2>
            <div className="subject-progress">
              <span>
                {p.completed} of {p.total} lessons
              </span>
              <strong>{p.percent}%</strong>
            </div>
            <ProgressBar percent={p.percent} />
          </div>
          {topicsOf(workspace, subjectId).map((t, ti) => (
            <div className="outline-topic" key={t.id}>
              <h3>
                <span>{String(ti + 1).padStart(2, '0')}</span>
                {t.name}
              </h3>
              {lessonsOf(workspace, t.id).map((l) => (
                <Link
                  className={`outline-lesson ${lesson.id === l.id ? 'active' : ''} ${l.completed ? 'complete' : ''}`}
                  aria-current={lesson.id === l.id ? 'page' : undefined}
                  key={l.id}
                  to={`/study/${l.id}`}
                >
                  {l.completed ? (
                    <CheckCircle2 size={17} />
                  ) : lesson.id === l.id ? (
                    <Play size={16} />
                  ) : (
                    <span className="outline-circle" />
                  )}
                  <span>{l.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
function Notes({ lesson }: { lesson: Lesson }) {
  const { change, notify } = useVault()
  const [draft, setDraft] = useState(lesson.notes)
  const [status, setStatus] = useState('Saved on this device')
  const draftRef = useRef(draft)
  const saved = useRef(lesson.notes)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveRef = useRef<() => Promise<void>>(async () => {})
  const dirty = draft !== saved.current
  const flush = async () => {
    clearTimeout(timer.current)
    const value = draftRef.current
    if (value === saved.current) return
    setStatus('Saving…')
    try {
      await change('lessons', lesson.id, { notes: value })
      saved.current = value
      setStatus(
        value === draftRef.current ? 'Saved on this device' : 'Unsaved changes',
      )
    } catch {
      setStatus('Could not save · try again')
      notify('Your notes could not be saved. Please try Save notes again.')
    }
  }
  saveRef.current = flush
  useEffect(() => {
    if (draftRef.current === saved.current) {
      setDraft(lesson.notes)
      draftRef.current = lesson.notes
      saved.current = lesson.notes
    }
  }, [lesson.notes])
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      void saveRef.current()
    },
    [],
  )
  useEffect(() => {
    if (!dirty) return
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  return (
    <section className="notes-panel">
      <div className="notes-heading">
        <h2>
          <FileText size={17} />
          Your notes
        </h2>
        <span aria-live="polite">{status}</span>
      </div>
      <textarea
        aria-label="Lesson notes"
        placeholder="Capture a thought. Ask a question. Make this lesson your own…"
        maxLength={20000}
        value={draft}
        onChange={(e) => {
          const value = e.target.value
          setDraft(value)
          draftRef.current = value
          setStatus('Unsaved changes')
          clearTimeout(timer.current)
          timer.current = setTimeout(() => {
            void saveRef.current()
          }, 800)
        }}
        onBlur={() => {
          void flush()
        }}
      />
      <div className="notes-footer">
        <span>{draft.length.toLocaleString()} / 20,000 characters</span>
        <button
          className="button button-secondary small-button"
          onClick={() => {
            void flush()
          }}
        >
          <Save size={14} />
          Save notes
        </button>
      </div>
    </section>
  )
}
