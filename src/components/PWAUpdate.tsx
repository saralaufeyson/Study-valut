import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { useVault } from '../lib/store'
export function PWAUpdate() {
  const { notify } = useVault()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onOfflineReady() {
      notify('Your study space is ready to use offline.')
    },
    onRegisterError() {
      notify(
        'Offline installation could not be enabled. You can keep studying in this tab.',
      )
    },
  })
  if (!needRefresh) return null
  return (
    <div className="pwa-update" role="status">
      <span>
        A fresh version of StudyVault is ready. Save your notes before
        refreshing.
      </span>
      <button
        className="button button-primary small-button"
        onClick={() => {
          void updateServiceWorker(true)
        }}
      >
        <RefreshCw size={13} />
        Refresh
      </button>
      <button
        className="icon-button"
        aria-label="Dismiss update"
        onClick={() => setNeedRefresh(false)}
      >
        <X size={16} />
      </button>
    </div>
  )
}
