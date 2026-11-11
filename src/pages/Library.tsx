import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Code2,
  Compass,
  FlaskConical,
  FolderPlus,
  GraduationCap,
  Languages,
  Pencil,
  Play,
  Plus,
  Search,
  Shapes,
  Trash2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useVault } from '../lib/store'
import {
  allLessons,
  lessonsOf,
  progress,
  resumeLesson,
  subjectLessons,
  subjectsOf,
  topicsOf,
} from '../lib/model'
import type { Subject, Table, Topic } from '../lib/model'
import { DeleteDialog, Editor } from '../components/Editor'
import type { EditorState } from '../components/Editor'

export function SubjectIcon({
  name,
  size = 22,
}: {
  name: string
  size?: number
}) {
  const Icon =
    (
      {
        book: BookOpen,
        code: Code2,
        math: Calculator,
        science: FlaskConical,
        art: Shapes,
        language: Languages,
      } as const
    )[name as 'book'] || BookOpen
  return <Icon size={size} strokeWidth={1.7} />
}
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label="Lesson completion"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}
function SubjectCard({
  subject,
  onEdit,
  onDelete,
}: {
  subject: Subject
  onEdit: () => void
  onDelete: () => void
}) {
  const { workspace } = useVault()
  const p = progress(subjectLessons(workspace, subject.id))
  const topicCount = topicsOf(workspace, subject.id).length
  return (
    <article className={`subject-card ${subject.color}`}>
      <div className="subject-card-top">
        <Link
          to={`/subjects/${subject.id}`}
          className="subject-icon"
          aria-label={`Open ${subject.name}`}
        >
          <SubjectIcon name={subject.icon} />
        </Link>
        <div className="card-actions">
          <button
            className="icon-button"
            aria-label={`Edit ${subject.name}`}
            onClick={onEdit}
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete ${subject.name}`}
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <Link to={`/subjects/${subject.id}`} className="subject-card-title">
        <h3>{subject.name}</h3>
        <ArrowUpRight size={18} />
      </Link>
      <p className="subject-description">
        {subject.description || 'A new chapter in your learning journey.'}
      </p>
      <div className="subject-meta">
        {topicCount} {topicCount === 1 ? 'topic' : 'topics'}
        <span>·</span>
        {p.total} {p.total === 1 ? 'lesson' : 'lessons'}
      </div>
      <div className="subject-progress">
        <span>
          {p.completed} of {p.total} completed
        </span>
        <strong>{p.percent}%</strong>
      </div>
      <ProgressBar percent={p.percent} />
    </article>
  )
}
function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-subjects">
      <div className="empty-icon">
        <FolderPlus size={27} strokeWidth={1.4} />
      </div>
      <h3>Every great journey starts with a subject.</h3>
      <p>
        Give your curiosity a home. Create a subject, add a few videos,
        <br className="desktop-break" /> and take it one lesson at a time.
      </p>
      <button className="button button-secondary" onClick={onCreate}>
        <Plus size={16} />
        Create your first subject
      </button>
      <p>
        <Link className="subtle-link" to="/settings#starter-packs">
          Browse exam starter packs <ArrowRight size={14} />
        </Link>
      </p>
    </div>
  )
}
export function Dashboard() {
  const { workspace } = useVault()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deleting, setDeleting] = useState<Subject | null>(null)
  const subjects = subjectsOf(workspace)
  const lessons = allLessons(workspace)
  const p = progress(lessons)
  const resume = resumeLesson(lessons)
  const resumeTopic = resume ? workspace.topics[resume.topic_id] : null
  const resumeSubject = resumeTopic
    ? workspace.subjects[resumeTopic.subject_id]
    : null
  const date = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="overline">YOUR OWN PACE. YOUR OWN PATH.</span>
          <h1>
            A little wiser, every day<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            Welcome to your corner of the learning world.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditor({ kind: 'subjects' })}
        >
          <Plus size={17} />
          Add a subject
        </button>
      </div>
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="welcome-kicker">
            <span className="live-dot" />
            {resume
              ? 'PICK UP WHERE YOU LEFT OFF'
              : p.total
                ? 'LOOK AT THAT PROGRESS'
                : 'GOOD THINGS TAKE A LITTLE CURIOSITY'}
          </span>
          <h2>
            {resume ? (
              'Your next chapter is waiting.'
            ) : p.total ? (
              'Look how far you’ve come.'
            ) : (
              <>
                Make space for your
                <br />
                next big idea.
              </>
            )}
          </h2>
          <p>
            {resume ? (
              <>
                {resumeSubject?.name} <span className="inline-dot">·</span>{' '}
                {resumeTopic?.name}
                <br />
                <strong>{resume.title}</strong>
              </>
            ) : p.total ? (
              `You’ve completed all ${p.total} ${p.total === 1 ? 'lesson' : 'lessons'} in your library. Revisit a favorite, or make room for something new.`
            ) : (
              'All your study videos, thoughtfully organized. Less searching, more learning. One lesson at a time.'
            )}
          </p>
          {resume ? (
            <Link to={`/study/${resume.id}`} className="button button-primary">
              <Play size={14} fill="currentColor" />
              Continue studying
              <ArrowRight size={15} />
            </Link>
          ) : (
            <button
              className="button button-primary"
              onClick={() => setEditor({ kind: 'subjects' })}
            >
              {p.total
                ? 'Explore something new'
                : 'Start your learning journey'}
              <ArrowRight size={15} />
            </button>
          )}
          <span className="hero-footnote">
            A quiet place to focus on what matters.
          </span>
        </div>
        <div className="book-scene" aria-hidden="true">
          <div className="scene-circle" />
          <span className="scene-spark spark-one">✳</span>
          <span className="scene-spark spark-two">✧</span>
          <span className="scene-dot" />
          <div className="book book-back">
            <span>STAY CURIOUS</span>
          </div>
          <div className="book book-middle" />
          <div className="book book-front">
            <span className="book-small">A SPACE FOR</span>
            <span className="book-word">
              bright
              <br />
              ideas.
            </span>
            <span className="book-flower">✳</span>
            <span className="book-rule" />
          </div>
          <div className="scene-caption">one page at a time.</div>
        </div>
      </section>
      <div className="section-heading">
        <h2>Your learning at a glance</h2>
        <span className="date-label">{date}</span>
      </div>
      <section className="stats-grid" aria-label="Learning overview">
        <article className="stat-card">
          <span className="stat-icon sage">
            <BookOpen size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Total subjects</span>
            <div className="stat-value">
              {subjects.length.toString().padStart(2, '0')}
              <span>subjects to explore</span>
            </div>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon sand">
            <CircleCheck size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Lessons completed</span>
            <div className="stat-value">
              {p.completed.toString().padStart(2, '0')}
              <span>of {p.total} lessons</span>
            </div>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">
            <Compass size={20} />
          </span>
          <div className="stat-body">
            <span className="stat-label">Overall progress</span>
            <div className="stat-value">
              {p.percent}
              <small>%</small>
              <span>
                {p.percent === 100 ? 'Beautifully done.' : 'Every step counts'}
              </span>
            </div>
            <ProgressBar percent={p.percent} />
          </div>
        </article>
      </section>
      <section>
        <div className="section-heading subjects-heading">
          <div>
            <h2>
              Your subjects{' '}
              <span className="heading-count">{subjects.length}</span>
            </h2>
            <p>A world of things to learn. All in one place.</p>
          </div>
          <Link to="/subjects" className="subtle-link">
            View all subjects
            <ArrowRight size={15} />
          </Link>
        </div>
        {subjects.length ? (
          <div className="subjects-grid">
            {subjects.slice(0, 5).map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                onEdit={() => setEditor({ kind: 'subjects', record: s })}
                onDelete={() => setDeleting(s)}
              />
            ))}
            <button
              className="add-subject-card"
              onClick={() => setEditor({ kind: 'subjects' })}
            >
              <span>
                <Plus size={23} />
              </span>
              <strong>Something new to learn?</strong>
              <small>Add a new subject</small>
            </button>
          </div>
        ) : (
          <EmptyLibrary onCreate={() => setEditor({ kind: 'subjects' })} />
        )}
      </section>
      {lessons.some((l) => l.last_opened_at) && (
        <section>
          <div className="section-heading">
            <h2>Recently opened</h2>
            <span className="eyebrow">KEEP THE MOMENTUM</span>
          </div>
          <div className="recent-list">
            {[...lessons]
              .filter((l) => l.last_opened_at)
              .sort((a, b) =>
                (b.last_opened_at || '').localeCompare(a.last_opened_at || ''),
              )
              .slice(0, 3)
              .map((l) => (
                <Link
                  key={l.id}
                  to={`/study/${l.id}`}
                  className="recent-lesson"
                >
                  <span
                    className={`recent-play ${l.completed ? 'is-complete' : ''}`}
                  >
                    {l.completed ? <Check size={18} /> : <Play size={17} />}
                  </span>
                  <div>
                    <strong>{l.title}</strong>
                    <span>
                      {
                        workspace.subjects[
                          workspace.topics[l.topic_id].subject_id
                        ].name
                      }{' '}
                      · {workspace.topics[l.topic_id].name}
                    </span>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
          </div>
        </section>
      )}
      {editor && <Editor editor={editor} onClose={() => setEditor(null)} />}
      {deleting && (
        <DeleteDialog
          table="subjects"
          id={deleting.id}
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
export function SubjectsPage() {
  const { workspace } = useVault()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deleting, setDeleting] = useState<Subject | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const subjects = subjectsOf(workspace)
  const filtered = subjects
    .filter((s) =>
      `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'progress'
          ? progress(subjectLessons(workspace, b.id)).percent -
            progress(subjectLessons(workspace, a.id)).percent
          : b.updated_at.localeCompare(a.updated_at),
    )
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <span className="overline">FOLLOW YOUR CURIOSITY</span>
          <h1>
            My subjects<span className="heading-period">.</span>
          </h1>
          <p className="page-subtitle">
            A home for everything you’re learning.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setEditor({ kind: 'subjects' })}
        >
          <Plus size={17} />
          Add a subject
        </button>
      </div>
      {subjects.length > 0 && (
        <div className="library-toolbar">
          <div className="input-with-icon search-input">
            <Search size={17} />
            <input
              aria-label="Search subjects"
              placeholder="Find a subject…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Sort subjects"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Recently updated</option>
            <option value="name">Name: A to Z</option>
            <option value="progress">Most progress</option>
          </select>
        </div>
      )}
      {!subjects.length ? (
        <EmptyLibrary onCreate={() => setEditor({ kind: 'subjects' })} />
      ) : filtered.length ? (
        <div className="subjects-grid">
          {filtered.map((s) => (
            <SubjectCard
              key={s.id}
              subject={s}
              onEdit={() => setEditor({ kind: 'subjects', record: s })}
              onDelete={() => setDeleting(s)}
            />
          ))}
          <button
            className="add-subject-card"
            onClick={() => setEditor({ kind: 'subjects' })}
          >
            <span>
              <Plus size={23} />
            </span>
            <strong>Room for a new idea</strong>
            <small>Add a subject</small>
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <Search size={28} />
          <h3>No subjects found</h3>
          <p>Try a different name or clear your search.</p>
          <button
            className="button button-secondary"
            onClick={() => setQuery('')}
          >
            Clear search
          </button>
        </div>
      )}
      {editor && <Editor editor={editor} onClose={() => setEditor(null)} />}
      {deleting && (
        <DeleteDialog
          table="subjects"
          id={deleting.id}
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
export function SubjectPage() {
  const { subjectId = '', topicId } = useParams()
  const { workspace, reorder, run } = useVault()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [deleting, setDeleting] = useState<{
    table: Table
    id: string
    name: string
  } | null>(null)
  const subject = workspace.subjects[subjectId]
  if (!subject || subject.deleted_at)
    return (
      <div className="page-content empty-state">
        <BookOpen size={32} />
        <h1>Subject not found</h1>
        <Link className="button button-secondary" to="/subjects">
          Back to subjects
        </Link>
      </div>
    )
  const topics = topicsOf(workspace, subject.id)
  const p = progress(subjectLessons(workspace, subject.id))
  const resume = resumeLesson(subjectLessons(workspace, subject.id))
  const selectedTopic = topicId ? topics.find((t) => t.id === topicId) : null
  function moveTopic(index: number, direction: number) {
    const ids = topics.map((t) => t.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    run(reorder('topics', ids))
  }
  return (
    <div className="page-content">
      <Link className="back-link" to="/subjects">
        <ChevronRight size={14} className="rotate-back" />
        All subjects
      </Link>
      <div className="page-heading">
        <div className="subject-page-title">
          <span className={`subject-icon large ${subject.color}`}>
            <SubjectIcon name={subject.icon} size={29} />
          </span>
          <div>
            <span className="overline">YOUR LEARNING LIBRARY</span>
            <h1>{subject.name}</h1>
            <p className="page-subtitle">
              {subject.description ||
                'One topic, one lesson, one step forward.'}
            </p>
          </div>
        </div>
        <div className="heading-actions">
          <button
            className="icon-button"
            aria-label="Edit subject"
            onClick={() => setEditor({ kind: 'subjects', record: subject })}
          >
            <Pencil size={17} />
          </button>
          <button
            className="button button-primary"
            onClick={() =>
              setEditor({
                kind: 'topics',
                parentId: subject.id,
                position: topics.length
                  ? Math.max(...topics.map((t) => t.position)) + 1
                  : 0,
              })
            }
          >
            <Plus size={17} />
            Add a topic
          </button>
        </div>
      </div>
      <div className="subject-summary">
        <div>
          <span className="eyebrow">SUBJECT PROGRESS</span>
          <strong>
            {p.percent}%
            <span>
              {p.completed} of {p.total} lessons complete
            </span>
          </strong>
          <ProgressBar percent={p.percent} />
        </div>
        {resume && (
          <Link className="button button-secondary" to={`/study/${resume.id}`}>
            <Play size={15} />
            Continue studying
          </Link>
        )}
      </div>
      <div className="section-heading">
        <h2>
          {selectedTopic ? selectedTopic.name : 'Topics'}{' '}
          <span className="heading-count">
            {selectedTopic ? 1 : topics.length}
          </span>
        </h2>
        {topicId && (
          <Link className="subtle-link" to={`/subjects/${subject.id}`}>
            Show all topics
            <ArrowRight size={14} />
          </Link>
        )}
        <span className="muted small">
          A little structure. A lot of possibility.
        </span>
      </div>
      {topicId && !selectedTopic ? (
        <div className="empty-state">
          <h3>Topic not found</h3>
          <Link to={`/subjects/${subject.id}`}>View all topics</Link>
        </div>
      ) : !topics.length ? (
        <div className="empty-subjects">
          <div className="empty-icon">
            <GraduationCap size={28} />
          </div>
          <h3>Let’s start with a topic.</h3>
          <p>
            Break this subject into chapters, then add your YouTube lessons.
          </p>
          <button
            className="button button-secondary"
            onClick={() =>
              setEditor({ kind: 'topics', parentId: subject.id, position: 0 })
            }
          >
            <Plus size={16} />
            Create your first topic
          </button>
        </div>
      ) : (
        <div className="topics-list">
          {(selectedTopic ? [selectedTopic] : topics).map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              subject={subject}
              onEdit={setEditor}
              onDelete={setDeleting}
              index={topics.indexOf(topic)}
              count={topics.length}
              onMove={moveTopic}
            />
          ))}
        </div>
      )}
      {editor && <Editor editor={editor} onClose={() => setEditor(null)} />}
      {deleting && (
        <DeleteDialog {...deleting} onClose={() => setDeleting(null)} />
      )}
    </div>
  )
}
function TopicCard({
  topic,
  subject,
  onEdit,
  onDelete,
  index,
  count,
  onMove,
}: {
  topic: Topic
  subject: Subject
  onEdit: (e: EditorState) => void
  onDelete: (e: { table: Table; id: string; name: string }) => void
  index: number
  count: number
  onMove: (i: number, d: number) => void
}) {
  const { workspace, change, reorder, run } = useVault()
  const [expanded, setExpanded] = useState(true)
  const lessons = lessonsOf(workspace, topic.id)
  const p = progress(lessons)
  function move(index: number, direction: number) {
    const ids = lessons.map((l) => l.id)
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    run(reorder('lessons', ids))
  }
  return (
    <section className="topic-card">
      <div className="topic-header">
        <button
          className="icon-button"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${topic.name}`}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <Link
          className="topic-title"
          to={`/subjects/${subject.id}/topics/${topic.id}`}
        >
          <span className="eyebrow">
            TOPIC {String(index + 1).padStart(2, '0')}
          </span>
          <h3>{topic.name}</h3>
        </Link>
        <span className="topic-progress">
          {p.completed}/{p.total}
          <CircleCheck size={15} />
        </span>
        <div className="topic-actions">
          <button
            className="icon-button"
            aria-label={`Move ${topic.name} up`}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp size={14} />
          </button>
          <button
            className="icon-button"
            aria-label={`Move ${topic.name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown size={14} />
          </button>
          <button
            className="icon-button"
            aria-label={`Edit ${topic.name}`}
            onClick={() =>
              onEdit({
                kind: 'topics',
                parentId: subject.id,
                position: topic.position,
                record: topic,
              })
            }
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-button"
            aria-label={`Delete ${topic.name}`}
            onClick={() =>
              onDelete({ table: 'topics', id: topic.id, name: topic.name })
            }
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <ProgressBar percent={p.percent} />
      {expanded && (
        <div className="topic-content">
          {lessons.map((lesson, i) => (
            <div
              className={`lesson-row ${lesson.completed ? 'lesson-complete' : ''}`}
              key={lesson.id}
            >
              <input
                className="completion-checkbox"
                type="checkbox"
                checked={lesson.completed}
                aria-label={`Mark ${lesson.title} ${lesson.completed ? 'incomplete' : 'complete'}`}
                onChange={(e) =>
                  run(
                    change('lessons', lesson.id, {
                      completed: e.target.checked,
                    }),
                  )
                }
              />
              <Link className="lesson-link" to={`/study/${lesson.id}`}>
                <span className="lesson-number">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{lesson.title}</span>
                <Play size={15} />
              </Link>
              <div className="lesson-actions">
                <button
                  className="icon-button"
                  aria-label={`Move ${lesson.title} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move ${lesson.title} down`}
                  disabled={i === lessons.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Edit ${lesson.title}`}
                  onClick={() =>
                    onEdit({
                      kind: 'lessons',
                      parentId: topic.id,
                      position: lesson.position,
                      record: lesson,
                    })
                  }
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete ${lesson.title}`}
                  onClick={() =>
                    onDelete({
                      table: 'lessons',
                      id: lesson.id,
                      name: lesson.title,
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!lessons.length && (
            <p className="topic-empty">Your next great lesson belongs here.</p>
          )}
          <button
            className="add-lesson-button"
            onClick={() =>
              onEdit({
                kind: 'lessons',
                parentId: topic.id,
                position: lessons.length
                  ? Math.max(...lessons.map((l) => l.position)) + 1
                  : 0,
              })
            }
          >
            <Plus size={16} />
            Add a YouTube lesson
          </button>
        </div>
      )}
    </section>
  )
}
