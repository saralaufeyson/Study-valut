import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Compass,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  Settings2,
  Sun,
  WifiOff,
  X,
} from 'lucide-react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { VaultProvider, useVault } from './lib/store'
import { subjectsOf } from './lib/model'
import { Dashboard, SubjectsPage, SubjectPage } from './pages/Library'
import { StudyPage } from './pages/Study'
import { SettingsPage } from './pages/Settings'
import { PWAUpdate } from './components/PWAUpdate'
import { PasswordResetPage } from './components/Account'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
function Shell() {
  const { workspace, user, online, syncState, notice } = useVault()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobile, setMobile] = useState(
    () => matchMedia('(max-width: 760px)').matches,
  )
  const sidebarRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLButtonElement>(null)
  const [dark, setDark] = useState(() => {
    try {
      return (
        (localStorage.getItem('studyvault-theme') ||
          (matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light')) === 'dark'
      )
    } catch {
      return false
    }
  })
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const location = useLocation()
  const isStudy = location.pathname.startsWith('/study/')
  const subjects = subjectsOf(workspace)
  const pending = Object.keys(workspace.pending).length
  const conflicts = Object.values(workspace.pending).filter(
    (p) => p.conflict,
  ).length
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('studyvault-theme', dark ? 'dark' : 'light')
    } catch {
      /* Preferences are optional. */
    }
  }, [dark])
  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])
  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault()
      setInstall(event as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', listener)
    return () => window.removeEventListener('beforeinstallprompt', listener)
  }, [])
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)')
    const update = () => {
      setMobile(media.matches)
      if (!media.matches) setSidebarOpen(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!sidebarOpen) return
    const controls = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled)',
        ) || [],
      )
    controls()[0]?.focus()
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
      if (event.key === 'Tab') {
        const items = controls(),
          first = items[0],
          last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('keydown', close)
      menuRef.current?.focus()
    }
  }, [sidebarOpen])
  const pageName =
    location.pathname === '/'
      ? 'Overview'
      : location.pathname.startsWith('/settings') ||
          location.pathname === '/reset-password'
        ? 'Settings'
        : isStudy
          ? 'Study mode'
          : 'My subjects'
  const status = !online
    ? 'Offline · saved on this device'
    : !user
      ? 'Saved on this device'
      : syncState === 'error'
        ? 'Sync needs attention'
        : conflicts
          ? `${conflicts} sync conflicts`
          : syncState === 'syncing'
            ? 'Syncing your library…'
            : pending
              ? `${pending} changes waiting to sync`
              : 'All changes synced'
  return (
    <div className={`app-shell ${isStudy ? 'studying' : ''}`}>
      {sidebarOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        inert={mobile && !sidebarOpen}
        aria-hidden={mobile && !sidebarOpen}
        role={mobile ? 'dialog' : undefined}
        aria-modal={mobile && sidebarOpen ? true : undefined}
        aria-label="Workspace navigation"
      >
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={19} />
        </button>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <BookOpen size={22} strokeWidth={1.8} />
          </span>
          <span>
            studyvault<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="workspace-switcher">
          <span className="workspace-avatar">
            <GraduationCap size={20} />
          </span>
          <div>
            <span className="eyebrow">PERSONAL WORKSPACE</span>
            <strong>My learning space</strong>
          </div>
          <span className="workspace-dot" />
        </div>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <LayoutDashboard size={18} />
            Overview
          </NavLink>
          <NavLink
            to="/subjects"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <BookOpen size={18} />
            My subjects<span className="nav-count">{subjects.length}</span>
          </NavLink>
        </nav>
        {subjects.length > 0 && (
          <div className="sidebar-subjects">
            <div className="nav-section-label">YOUR SUBJECTS</div>
            {subjects.slice(0, 5).map((s) => (
              <Link key={s.id} to={`/subjects/${s.id}`} className="subject-nav">
                <i className={`color-dot ${s.color}`} />
                <span>{s.name}</span>
              </Link>
            ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="little-spark">✳</span>
            <strong>A little progress, every day.</strong>
            <p>
              Your own pace. Your own space.
              <br />
              Make today a learning day.
            </p>
          </div>
          {install && (
            <button
              className="nav-link"
              onClick={() => {
                void install
                  .prompt()
                  .then(() => install.userChoice)
                  .then((choice) => {
                    if (choice.outcome === 'accepted') setInstall(null)
                  })
              }}
            >
              <ArrowDownToLine size={18} />
              Install StudyVault
            </button>
          )}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Settings2 size={18} />
            Settings & backups
          </NavLink>
          <div className="profile-card">
            <Link to="/settings" className="profile-avatar">
              {user?.email?.[0].toUpperCase() || 'L'}
            </Link>
            <Link to="/settings" className="profile-copy">
              <strong>{user?.email || 'Local workspace'}</strong>
              <span>
                {user ? 'Personal account' : 'Sign in to sync devices'}
                <ChevronRight size={11} />
              </span>
            </Link>
            <button
              className="icon-button"
              aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>
      <main
        className="main-panel"
        id="main-content"
        inert={mobile && sidebarOpen}
      >
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            ref={menuRef}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>My learning</span>
            <ChevronRight size={13} />
            <strong>{pageName}</strong>
          </div>
          <div className="topbar-actions">
            <Link
              to="/settings"
              className={`sync-status ${syncState === 'error' || conflicts ? 'status-warning' : ''}`}
              title={status}
            >
              {!online ? (
                <WifiOff size={14} />
              ) : !user ? (
                <CloudOff size={14} />
              ) : syncState === 'synced' && !pending ? (
                <Check size={14} />
              ) : (
                <Cloud size={14} />
              )}
              <span>{status}</span>
            </Link>
            <span className="topbar-divider" />
            <Link
              to="/settings"
              className="topbar-avatar"
              aria-label="Account settings"
            >
              {user?.email?.[0].toUpperCase() || 'L'}
            </Link>
          </div>
        </header>
        {!online && (
          <div className="connection-banner">
            <WifiOff size={14} />
            Your library is available offline. Videos need an internet
            connection.
          </div>
        )}
        {conflicts > 0 && (
          <Link
            to="/settings#conflicts"
            className="connection-banner warning-banner"
          >
            Some changes need your review.
            <span>
              Review conflicts <ArrowRight size={14} />
            </span>
          </Link>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/subjects/:subjectId" element={<SubjectPage />} />
          <Route
            path="/subjects/:subjectId/topics/:topicId"
            element={<SubjectPage />}
          />
          <Route path="/study/:lessonId" element={<StudyPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route
            path="*"
            element={
              <div className="page-content empty-state">
                <Compass size={36} />
                <h1>Let’s get you back on track.</h1>
                <Link to="/" className="button button-primary">
                  Back to overview
                </Link>
              </div>
            }
          />
        </Routes>
        {!isStudy && (
          <footer className="page-footer">
            <span>
              <BookOpen size={13} />A calm place for a curious mind.
            </span>
            <span>Made for your learning journey</span>
          </footer>
        )}
      </main>
      <PWAUpdate />
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
        </div>
      )}
    </div>
  )
}
export default function App() {
  return (
    <VaultProvider>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Shell />
    </VaultProvider>
  )
}
