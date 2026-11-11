import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { acknowledge, mergeRemote, putChange, transact } from './database'
import type { Entity, Table, Workspace } from './model'
import type { Backup } from './backup'
import type { Json } from './database.types'
import { parseSyncResult } from './sync-result'
import { addStarterPack, getStarterPack } from './starter-pack'
import type { StarterPackId } from './starter-pack'

type SyncState = 'local' | 'offline' | 'syncing' | 'synced' | 'error'
interface Store {
  workspace: Workspace
  user: User | null
  online: boolean
  syncState: SyncState
  syncError: string
  notice: string
  notify: (message: string) => void
  run: (task: Promise<unknown>) => void
  create: (table: Table, patch: Record<string, unknown>) => Promise<string>
  change: (
    table: Table,
    id: string,
    patch: Record<string, unknown>,
  ) => Promise<void>
  remove: (table: Table, id: string) => Promise<void>
  reorder: (table: 'topics' | 'lessons', ids: string[]) => Promise<void>
  importData: (backup: Backup) => Promise<void>
  addStarter: (id: StarterPackId) => Promise<void>
  sync: () => Promise<void>
  resolve: (id: string, keepLocal: boolean) => Promise<void>
}
const Context = createContext<Store | null>(null)
export function useVault() {
  const value = useContext(Context)
  if (!value) throw new Error('StudyVault provider missing')
  return value
}
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : 'Something went wrong. Please try again.'

export function VaultProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loadedScope, setLoadedScope] = useState('')
  const [storageError, setStorageError] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncState, setSyncState] = useState<SyncState>('local')
  const [syncError, setSyncError] = useState('')
  const [notice, setNotice] = useState('')
  const scope = user?.id || 'guest'
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const syncing = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)
  const syncRef = useRef<() => Promise<void>>(async () => {})
  const notify = useCallback((value: string) => setNotice(value), [])
  const run = useCallback(
    (task: Promise<unknown>) => {
      void task.catch((e) => notify(message(e)))
    },
    [notify],
  )
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 7000)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setUser(data.session?.user || null)
          setAuthReady(true)
          if (error) notify(error.message)
        }
      })
      .catch((e) => {
        if (active) {
          setAuthReady(true)
          notify(message(e))
        }
      })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAuthReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [notify])
  const refresh = useCallback(async () => {
    const data = await transact(scope)
    if (scopeRef.current === scope) {
      setWorkspace(data)
      setLoadedScope(scope)
      setStorageError('')
    }
  }, [scope])
  useEffect(() => {
    if (!authReady) return
    void refresh().catch((e) => setStorageError(message(e)))
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('studyvault-changes')
      channel.current.onmessage = () => {
        run(refresh())
      }
    }
    return () => {
      channel.current?.close()
      channel.current = null
    }
  }, [authReady, refresh, run])
  const save = useCallback(
    async (update: (w: Workspace) => void) => {
      const data = await transact(scope, update)
      if (scopeRef.current === scope) {
        setWorkspace(data)
        setLoadedScope(scope)
      }
      channel.current?.postMessage(scope)
      setTimeout(() => {
        void syncRef.current()
      }, 0)
    },
    [scope],
  )

  const sync = useCallback(async () => {
    if (!supabase || !user) {
      setSyncState('local')
      return
    }
    if (!navigator.onLine) {
      setSyncState('offline')
      return
    }
    if (syncing.current) return
    syncing.current = true
    const client = supabase
    const perform = async () => {
      if (scopeRef.current !== scope) return
      setSyncState('syncing')
      setSyncError('')
      const { data: auth } = await client.auth.getSession()
      if (auth.session?.user.id !== scope) return
      const snapshot = await transact(scope)
      for (const table of ['subjects', 'topics', 'lessons'] as Table[]) {
        for (const sent of Object.values(snapshot.pending).filter(
          (p) => p.table === table && !p.conflict,
        )) {
          if (scopeRef.current !== scope) return
          const { data: response, error } = await client.rpc(
            'apply_study_change',
            {
              p_table: table,
              p_id: sent.record_id,
              p_expected_revision: sent.baseRevision,
              p_patch: sent.patch as Json,
              p_mutation_id: sent.mutation_id,
            },
          )
          if (error) throw error
          const data = parseSyncResult(response, sent.record_id)
          await transact(scope, (w) => {
            if (data.conflict) {
              if (w.pending[sent.record_id])
                w.pending[sent.record_id].conflict = {
                  row: data.row,
                  reason: data.reason,
                }
            } else acknowledge(w, sent, data.row as Entity)
          })
        }
      }
      for (const table of ['subjects', 'topics', 'lessons'] as Table[]) {
        let page = 0
        while (true) {
          if (scopeRef.current !== scope) return
          const { data, error } = await client
            .from(table)
            .select('*')
            .eq('user_id', user.id)
            .order('id')
            .range(page * 500, page * 500 + 499)
          if (error) throw error
          await transact(scope, (w) => mergeRemote(w, table, data as Entity[]))
          if (data.length < 500) break
          page++
        }
      }
      await transact(scope, (w) => {
        w.lastSynced = new Date().toISOString()
      })
      await refresh()
      channel.current?.postMessage(scope)
      if (scopeRef.current === scope) setSyncState('synced')
    }
    try {
      if (navigator.locks)
        await navigator.locks.request(`studyvault-sync-${scope}`, perform)
      else await perform()
    } catch (error) {
      if (scopeRef.current === scope) {
        setSyncState(navigator.onLine ? 'error' : 'offline')
        setSyncError(message(error))
        await refresh().catch(() => {})
      }
    } finally {
      syncing.current = false
    }
  }, [user, scope, refresh])
  syncRef.current = sync
  useEffect(() => {
    if (!authReady) return
    const onOnline = () => {
      setOnline(true)
      void sync()
    }
    const onOffline = () => {
      setOnline(false)
      setSyncState(user ? 'offline' : 'local')
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        run(refresh())
        void sync()
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => {
      void sync()
    }, 20000)
    void sync()
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [authReady, user, sync, refresh, run])

  async function change(
    table: Table,
    id: string,
    patch: Record<string, unknown>,
  ) {
    await save((w) => putChange(w, table, id, patch, !!user))
  }
  async function create(table: Table, patch: Record<string, unknown>) {
    const id = crypto.randomUUID()
    await change(table, id, patch)
    return id
  }
  async function remove(table: Table, id: string) {
    await change(table, id, { deleted_at: new Date().toISOString() })
    notify('Deleted from your library.')
  }
  async function reorder(table: 'topics' | 'lessons', ids: string[]) {
    await save((w) =>
      ids.forEach((id, position) =>
        putChange(w, table, id, { position }, !!user),
      ),
    )
  }
  async function importData(backup: Backup) {
    const ids = new Map(
      [...backup.subjects, ...backup.topics, ...backup.lessons].map((row) => [
        row.id,
        crypto.randomUUID(),
      ]),
    )
    await save((w) => {
      for (const s of backup.subjects)
        putChange(
          w,
          'subjects',
          ids.get(s.id)!,
          {
            name: s.name,
            description: s.description,
            color: s.color,
            icon: s.icon,
          },
          !!user,
        )
      for (const t of backup.topics)
        putChange(
          w,
          'topics',
          ids.get(t.id)!,
          {
            subject_id: ids.get(t.subject_id),
            name: t.name,
            position: t.position,
          },
          !!user,
        )
      for (const l of backup.lessons)
        putChange(
          w,
          'lessons',
          ids.get(l.id)!,
          {
            topic_id: ids.get(l.topic_id),
            title: l.title,
            url: l.url,
            video_id: l.video_id,
            position: l.position,
            completed: l.completed,
            notes: l.notes,
            last_opened_at: l.last_opened_at,
          },
          !!user,
        )
    })
    notify(
      `Imported ${backup.subjects.length} subjects and ${backup.lessons.length} lessons.`,
    )
  }
  async function resolve(id: string, keepLocal: boolean) {
    await save((w) => {
      const pending = w.pending[id]
      if (!pending?.conflict) return
      const row = pending.conflict.row
      if (keepLocal) {
        pending.baseRevision = row?.revision ?? 0
        pending.mutation_id = crypto.randomUUID()
        if (row?.deleted_at && !pending.patch.deleted_at) {
          pending.patch.deleted_at = null
          const record = (w[pending.table] as Record<string, Entity>)[id]
          if (record) record.deleted_at = null
        }
        delete pending.conflict
      } else {
        const records = w[pending.table] as Record<string, Entity>
        if (row) records[id] = row
        else delete records[id]
        delete w.pending[id]
      }
    })
  }
  async function addStarter(id: StarterPackId) {
    const pack = getStarterPack(id)
    let added = { subjects: 0, topics: 0 }
    await save((w) => {
      added = addStarterPack(w, !!user, id)
    })
    notify(
      added.subjects || added.topics
        ? `Added ${added.subjects} subjects and ${added.topics} topics for ${pack.shortName}. Add your first video to begin.`
        : `Your ${pack.shortName} subjects and topics are already in this library.`,
    )
  }
  if (storageError)
    return (
      <div className="fatal-state">
        <h1>Your library couldn’t be opened</h1>
        <p>{storageError}</p>
        <p>
          Enable browser storage, then reload. Your saved data has not been
          replaced.
        </p>
        <button
          className="button button-primary"
          onClick={() => location.reload()}
        >
          Reload StudyVault
        </button>
      </div>
    )
  if (!authReady || !workspace || loadedScope !== scope)
    return (
      <div className="boot-state">
        <span className="loader" />
        Opening your study space…
      </div>
    )
  return (
    <Context.Provider
      value={{
        workspace,
        user,
        online,
        syncState,
        syncError,
        notice,
        notify,
        run,
        create,
        change,
        remove,
        reorder,
        importData,
        addStarter,
        sync,
        resolve,
      }}
    >
      {children}
    </Context.Provider>
  )
}
