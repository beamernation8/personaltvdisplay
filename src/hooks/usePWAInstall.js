import { useEffect, useState } from 'react'

/**
 * Captures the browser's `beforeinstallprompt` event so we can trigger
 * the PWA install prompt on demand.
 *
 * Returns:
 *   canInstall  — true if the browser supports PWA install and it hasn't been dismissed
 *   install()   — call this to show the native install dialog
 *   installed   — true once the user accepted the prompt
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  return { canInstall: !!deferredPrompt && !installed, install, installed }
}
