import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpecEditorApp } from '../adapters/spec-editor-app'
import { VSCodeStorageAdapter } from '../adapters/vscode-storage-adapter'
import type { VSCodeFsPort } from '../core/storage/storage-adapter'
import 'react-data-grid/lib/styles.css'
import '../index.css'

type MountVSCodeAppParams = {
  target: HTMLElement
  fsPort: VSCodeFsPort
  storageKey?: string
}

export function mountVSCodeApp({ target, fsPort, storageKey }: MountVSCodeAppParams): void {
  const storageAdapter = new VSCodeStorageAdapter(fsPort)
  createRoot(target).render(
    <StrictMode>
      <SpecEditorApp storageAdapter={storageAdapter} storageKey={storageKey} />
    </StrictMode>,
  )
}

