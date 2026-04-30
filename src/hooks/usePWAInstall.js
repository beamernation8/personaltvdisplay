import { useSyncExternalStore, useCallback } from 'react'

/**
 * Captures the browser's `beforeinstallprompt` event so we can trigger
 * the PWA install prompt on demand.
 *
 * Uses a module-level singleton so multiple component instances (lock screen
 * AND AuthPill) always share the same captured prompt — the event only fires
 * once per page load.
 *
 * Returns:
 *   canInstall  — true if the browser supports PWA install and it hasn't been dismissed
 *   install()   — call this to show the native install dialog
 *   installed   — true once the user accepted the prompt
 */

/* ── Module-level singleton ──────────────────────────────────────── */
let _deferredPrompt = null
let _installed = false
const _listeners = new Set()

function _notify() { _listeners.forEach(fn => fn()) }

function _subscribe(cb) {
  _listeners.add(cb)
  return () => _listeners.delete(cb)
}

function _getSnapshot() {
  return _installed ? 'installed' : _deferredPrompt ? 'ready' : 'none'
}

// Capture the prompt exactly once at module load time
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _deferredPrompt = e
    _notify()
  })
  window.addEventListener('appinstalled', () => {
    _installed = true
    _deferredPrompt = null
    _notify()
  })
}

/* ── Hook ────────────────────────────────────────────────────────── */
export function usePWAInstall() {
  const snapshot = useSyncExternalStore(_subscribe, _getSnapshot)

  const install = useCallback(async () => {
    if (!_deferredPrompt) return
    _deferredPrompt.prompt()
    const { outcome } = await _deferredPrompt.userChoice
    if (outcome === 'accepted') _installed = true
    _deferredPrompt = null
    _notify()
  }, [])

  return {
    canInstall: snapshot === 'ready',
    install,
    installed: snapshot === 'installed'
  }
}
