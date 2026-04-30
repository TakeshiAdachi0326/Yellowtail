import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TauriStorageAdapter } from '../adapters/tauri-storage-adapter'
import App from '../App'
import type { TauriFsPort } from '../core/storage/storage-adapter'
import 'react-data-grid/lib/styles.css'
import '../index.css'

type MountTauriAppParams = {
  target: HTMLElement
  fsPort: TauriFsPort
  storageKey?: string
}

export function mountTauriApp({ target, fsPort, storageKey }: MountTauriAppParams): void {
  const storageAdapter = new TauriStorageAdapter(fsPort)
  createRoot(target).render(
    <StrictMode>
      <App storageAdapter={storageAdapter} storageKey={storageKey} />
    </StrictMode>,
  )
}

